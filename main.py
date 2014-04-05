# -*- coding: utf-8 -*-
import os
import logging
import cgi
import hashlib
import urllib
import json
import re  #regular expressions
import webapp2
import jinja2
from datetime import datetime #for handling dates

from google.appengine.api import users
from google.appengine.ext import ndb

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True)


class Session(ndb.Model):
    """Models a meditation session"""
    date = ndb.DateTimeProperty(auto_now_add=True)
    user = ndb.StringProperty()
    duration = ndb.IntegerProperty()
    goal = ndb.IntegerProperty()
    reached_goal = ndb.BooleanProperty()


def get_user():
    try:
        return users.get_current_user().nickname()
    except AttributeError:
        # Will throw AttributeError in local testing
        return 'jrrera' # Return whoever is developing the app here

def get_month():
    month = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December']

    # Generates a numerical representation of month. i.e. April = '04'
    # So we convert to an integer and subtract 1 since lists are zero-based
    num_month = int(datetime.now().strftime("%m"))

    return month[num_month - 1]

#Begin request handlers
class MainPage(webapp2.RequestHandler):
    def get(self):
        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render()) 

class GetSessions(webapp2.RequestHandler):
    def get(self):

        user = get_user()
        # Grab all surveys
        query = Session.query(user == user).fetch()
        
        json_shell = {} #Creates JSON object
        json_shell['request_type'] = "get_sessions"
        json_shell['quantity'] = len(query)
        json_shell['user'] = user


        sessions_array = []
        for entry in query:
            
            session = {}

            #Converts UTC date to milliseconds for Javascript. Based on:
            # stackoverflow.com/questions/5022447/converting-date-from-python-to-javascript
            js_date = int(mktime(entry.date.timetuple())) * 1000 # This may not work.

            # or: d = datetime.utcnow()
            # js_date = int(mktime(d.timetuple())) * 1000 

            session['date'] = js_date
            session['duration'] = entry.duration
            session['goal'] = entry.goal
            session['reachedGoal'] = entry.reached_goal
            
            sessions_array.append(session)


        json_shell['sessions'] = sessions_array

        final_json = json.dumps(json_shell, encoding="utf-8", separators=(',',':'), sort_keys=True)
  
        self.response.headers.add_header('content-type', 'application/json', charset='utf-8')
        self.response.write(final_json)


class Submit(webapp2.RequestHandler):
    def post(self):

        # Grab ldap and hash it
        ldap = get_ldap()
        hashed_ldap = hashlib.sha1(ldap).hexdigest()

        # Grab the payload from POST request and today's month
        survey_dict = json.loads(self.request.body)
        month = get_month()

        # Pre-process received data, including escaping HTML chars
        safe_survey_dict = {} # Escaped / processed data will go in here
        safe_survey_dict['satisfaction'] = int(survey_dict.get('satisfaction'), 0)
        safe_survey_dict['recent_activity'] = cgi.escape(survey_dict.get('recentActivity'), "")
        safe_survey_dict['improvement'] = cgi.escape(survey_dict.get('improveIdea'), "")
        safe_survey_dict['comments'] = cgi.escape(survey_dict.get('comments'), "")
        safe_survey_dict['site_cluster'] = cgi.escape(survey_dict.get('siteCluster'), "")
        safe_survey_dict['hashed_ldap'] = hashed_ldap
        safe_survey_dict['month'] = month

        # Begin validity check
        validity_check = self.verify_data_integrity(safe_survey_dict)

        # If not valid, terminate process and notify user
        if validity_check != "valid":
            response = {"status": "duplicate"}
            self.response.write(json.dumps(response))
            return
        
        # Should we overwrite previous survey if one exists for this month?
        overwrite = survey_dict.get('overwrite', False) 

        # If you've already filled out the survey this month, 
        # report this back to the front-end for further validation
        preexist_query = Survey.query(
            Survey.hashed_ldap == safe_survey_dict['hashed_ldap'], 
            Survey.month == safe_survey_dict['month']
        ).fetch()

        # If you've given instructions to overwrite, we skip this phase
        if len(preexist_query) > 0:

            print "Trying to submit another entry"

            # If we didn't receive instructions to overwrite, terminate
            # process and notify the user. Else continue
            if not overwrite:
                response = {"status": "duplicate"}
                self.response.write(json.dumps(response))
                return
        
        # If we have preexisting entry and instructions to overwrite,
        # we'll modify the existing entry. Otherwise, make a new entity
        if overwrite and len(preexist_query) > 0:
            gsat_survey = preexist_query[0]
        else:
            gsat_survey = Survey()

        # Populate the entity with cleaned dictionary values and save
        gsat_survey.populate(**safe_survey_dict)
        gsat_survey.put()

        # This function will eventually store entries from hash to ldap
        self.store_ldap_dash() 

        # Let user know this was a success!
        response = {"status": "success"}
        self.response.write(json.dumps(response))


app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/get', GetSessions),
    ('/submit', Submit)
], debug=True)