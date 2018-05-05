/**
 * Module dependencies.
 */
const express = require('express');
const cors = require("cors")
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const path = require('path');
const mongoose = require('mongoose');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const options = {
  apiKey: '429647716d4133d9f9cdaf5fa0f3ac7248bbfff447dde16443d4c4842f27749a',         // use your sandbox app API key for development in the test environment
  username: 'sandbox',      // use 'sandbox' for development in the test environment
};
const AfricasTalking = require('africastalking')(options);
const User = require('./models/User');


/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({ path: '.env.example' });

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');
const userController = require('./controllers/user');
const ussdController = require('./controllers/ussd');

/**
 * Create Express server.
 */
const app = express();

/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
  process.exit();
});

/**
 * Express configuration.
 */
app.set('host', process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0');
app.set('port', process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080);
app.use(expressStatusMonitor());
app.use(compression());
app.use(logger('dev'));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  cookie: { maxAge: 1209600000 }, // two weeks in milliseconds
  store: new MongoStore({
    url: process.env.MONGODB_URI,
    autoReconnect: true,
  })
}));

var sessionObj = "";
/*app.use(function (req, res, next) {
  sessionObj = req.session;
    console.log(sessionObj);
    if (!req.session.userState) {
      
    }
    next();
  });
  */


/**
 * Primary app routes.
 */
app.get('/', homeController.index);

app.get('/data/:taxid', userController.getReserve);
app.post('/data', userController.postReserve);


app.get("/alldata", userController.getAllReserves);

//app.post("/ussd", ussdController.postUssd );

app.post("/ussd", new AfricasTalking.USSD((params, next) => {
  let endSession = false;
  let message = '';
  var user;
  User.findOne({ phoneNumber: params.phoneNumber }, (err, existingUser) => {
    if (existingUser) {
      user = existingUser;
    }
    
  });

  
  //console.log(req);
  //const session = req.session.get(params.sessionId);
  //const user = db.getUserByPhone(params.phoneNumber);

  if (user) {
    var state = user.state;
    
    
    if (params.text === '') {
      message = "Welcome to ChainAid \n";
      message += "1: Registration \n";
      message += "2: Collect";
      user.state = "menu";
      user.save((err) => {});
    }
    
    if(state=='menu'){
      if (params.text === '1') {
        message = "Please enter your firstname \n"; 
        user.state = "1a";
        user.save((err) => {}); 
      }else if (params.text === '2') {
        message = "Show this code to the agent" + Math.floor((Math.random() * 100) + 1) +" \n";  
      }
    }else if(state=="1a"){
      message = "Please enter your lastname \n"; 
      user.first_name = params.text;
      user.state = "1b";
      user.save((err) => {}); 
    }
    else if(state=="1b"){
      message = "Are you Male or Female? \n";
      message += "1: Male \n";
      message += "2: Female";
      user.last_name = params.text;
      user.state = "1c";
      user.save((err) => {}); 
    }
    else if(state=="1c"){
      if (params.text === '1') {
        message = "Thanks, you have been registered \n"; 
        user.gender = "male";
        user.state = "menu";
        user.save((err) => {}); 
      }else if (params.text === '2') {
        message = "Thanks, you have been registered \n"; 
        user.gender = "female";
        user.state = "menu";
        user.save((err) => {}); 
      }
    }
    
    
    
  }else{
    const user = new User();
    user.telephone = params.phoneNumber;
    user.state = "menu";
    user.save((err) => {});
    if (params.text === '') {
      message = "Welcome to ChainAid \n";
      message += "1: Registration \n";
      message += "2: Collect";
    }
  }
  next({
      response: message, 
      endSession: endSession
  });
}));





/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
  console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env'));
  console.log('  Press CTRL-C to stop\n');
});

module.exports = app;
