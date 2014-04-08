# -*- coding: utf-8 -*-
# jsfnczxqewbceccx
import os
import logging
import cgi
import hashlib
import urllib
import json
import re  #regular expressions
import webapp2
from time import mktime
import jinja2
from datetime import datetime #for handling dates

from google.appengine.api import users
from google.appengine.ext import ndb

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=True,
    variable_start_string='((', 
    variable_end_string='))')


class Session(ndb.Model):
    """ Models a meditation session """
    date = ndb.DateTimeProperty(auto_now_add=True)
    user = ndb.StringProperty()
    duration = ndb.IntegerProperty()
    goal = ndb.IntegerProperty()
    reached_goal = ndb.BooleanProperty()

class UserData(ndb.Model):
    """ Models a user of the meditation app """
    signup_date = ndb.DateTimeProperty(auto_now_add=True)
    user = ndb.StringProperty()
    email = ndb.StringProperty()
    last_duration = ndb.IntegerProperty()
    last_goal = ndb.IntegerProperty()

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

def check_logged_in():
    if users.get_current_user():        
        return True
    else: 
        return False


#Begin request handlers
class MainPage(webapp2.RequestHandler):
    def get(self):
        if not check_logged_in():
            self.redirect(users.create_login_url(self.request.uri))
            return

        template = JINJA_ENVIRONMENT.get_template('index.html')
        self.response.write(template.render()) 

class GetSessions(webapp2.RequestHandler):
    def get(self):

        if not check_logged_in():
            self.redirect(users.create_login_url(self.request.uri))
            return

        user = get_user()
        # Grab all surveys
        query = Session.query(Session.user == user).fetch()
        
        json_shell = {} #Creates JSON object
        json_shell['request_type'] = "get_sessions"
        json_shell['quantity'] = len(query)
        json_shell['user'] = user

        # If no data, return empty list. Else, populate
        if len(query) == 0:
            json_shell['sessions'] = []

        else:
            sessions_array = []
            for entry in query:
                
                session = {}

                #Converts UTC date to milliseconds for Javascript. Based on:
                # stackoverflow.com/questions/5022447/converting-date-from-python-to-javascript
                js_date = int(mktime(entry.date.timetuple())) * 1000 # This may not work.

                session['date'] = js_date
                session['duration'] = entry.duration
                session['goal'] = entry.goal
                session['reachedGoal'] = entry.reached_goal
                
                sessions_array.append(session)


            json_shell['sessions'] = sessions_array

        final_json = json.dumps(json_shell, encoding="utf-8", separators=(',',':'), sort_keys=True)
  
        self.response.headers.add_header('content-type', 'application/json', charset='utf-8')
        self.response.write(final_json)

class GetUserData(webapp2.RequestHandler):
    def get(self):

        if not check_logged_in():
            self.redirect(users.create_login_url(self.request.uri))
            return

        user = get_user()

        # Grab userdata
        query = UserData.query(UserData.user == user).fetch()

        json_shell = {} #Creates JSON object
        json_shell['request_type'] = "user_data"

        # If no match, create new user
        print len(query)
        print query

        if len(query) == 0:

            # Create new user and put
            user_data = UserData()
            email = users.get_current_user().email()
            last_duration = 0
            last_goal = 0

            user_data.put()

            # Populate JSON shell
            json_shell['signupDate'] = int(mktime(datetime.now().timetuple())) * 1000
            json_shell['email'] = email
            json_shell['lastDuration'] = last_duration
            json_shell['lastGoal'] = last_goal

        else:
            print "User should exist!"
            user_data = query[0]

            json_shell['signupDate'] = int(mktime(user_data.signup_date.timetuple())) * 1000
            json_shell['email'] = user_data.email
            json_shell['lastDuration'] = user_data.last_duration
            json_shell['lastGoal'] = user_data.last_goal

        final_json = json.dumps(json_shell, encoding="utf-8", separators=(',',':'), sort_keys=True)
  
        self.response.headers.add_header('content-type', 'application/json', charset='utf-8')
        self.response.write(final_json)        


class SubmitSession(webapp2.RequestHandler):
    def post(self):

        if not check_logged_in():
            self.redirect(users.create_login_url(self.request.uri))
            return

        # Grab user
        user = get_user()

        # Grab the payload from POST request and today's month
        session_dict = json.loads(self.request.body)

        # Pre-process received data, including escaping HTML chars
        safe_session_dict = {} # Escaped / processed data will go in here

        safe_session_dict['user'] = user
        safe_session_dict['duration'] = int(session_dict.get('duration'), 0)
        safe_session_dict['goal'] = int(session_dict.get('goal'), 0)
        safe_session_dict['reached_goal'] = bool(session_dict.get('reachedGoal'), False)

        # Begin validity check
        # validity_check = self.verify_data_integrity(safe_session_dict)

        new_session = Session()

        # Populate the entity with cleaned dictionary values and save
        new_session.populate(**safe_survey_dict)
        new_session.put()

        # Let user know this was a success!
        response = {"status": "success"}
        self.response.write(json.dumps(response))

class UpdateUser(webapp2.RequestHandler):
    def post(self):

        if not check_logged_in():
            self.redirect(users.create_login_url(self.request.uri))
            return

        # Grab user and user data
        user = get_user()
        user_data = User.query(user == user).fetch()[0]

        # Flips to true if any updates were made
        updated = False

        # Grab the payload from POST request and today's month
        user_dict = json.loads(self.request.body)

        if user_dict.get('duration'):
            user_data.last_duration = int(user_dict.get('duration'))
            updated = True

        if user_dict.get('goal'):
            user_data.last_goal = int(user_dict.get('goal'))
            updated = True

        user_dict.put()

        # Pre-process received data, including escaping HTML chars
        safe_user_dict = {} # Escaped / processed data will go in here

        safe_user_dict['user'] = user
        safe_user_dict['duration'] = int(user_dict.get('duration'), 0)
        safe_user_dict['goal'] = int(user_dict.get('goal'), 0)
        safe_user_dict['reached_goal'] = bool(user_dict.get('reachedGoal'), False)

        # Begin validity check
        # validity_check = self.verify_data_integrity(safe_user_dict)

        new_user = user()

        # Populate the entity with cleaned dictionary values and save
        new_user.populate(**safe_survey_dict)
        new_user.put()

        # Let user know this was a success!
        response = {"status": "success"}
        self.response.write(json.dumps(response))        


app = webapp2.WSGIApplication([
    ('/', MainPage),
    ('/getsessions', GetSessions),
    ('/getuser', GetUserData),
    ('/submit', SubmitSession),
    ('/updateuser', UpdateUser)
], debug=True)