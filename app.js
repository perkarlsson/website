const express = require('express');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const promisify = require('es6-promisify');
const flash = require('connect-flash');
const expressValidator = require('express-validator');
const routes = require('./routes/index');
const helpers = require('./helpers');
const errorHandlers = require('./handlers/errorHandlers');
const sitemap = require('sitemap');

// create our Express app
const app = express();

//create sitemap
const sm = sitemap.createSitemap({
  hostname: 'https://www.anthropawlogyvet.com',
  cacheTime: 600000,        // 600 sec - cache purge period
  urls: [
    { url: '/', changefreq: 'daily', priority: 1.00 },
    { url: '/homecare/', changefreq: 'daily', priority: 0.8 },
    { url: '/hospice/', changefreq: 'daily', priority: 0.8 },
    { url: '/booking/', changefreq: 'daily', priority: 0.8 },
    { url: '/about/', changefreq: 'daily', priority: 0.5 },
  ]
})


// view engine setup
app.set('views', path.join(__dirname, 'views')); // this is the folder where we keep our pug files
app.set('view engine', 'pug'); // we use the engine pug, mustache or EJS work great too

// serves up static files from the public folder. Anything in public/ will just be served up as the file it is
app.use(express.static(path.join(__dirname, 'public')));

// Takes the raw requests and turns them into usable properties on req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Exposes a bunch of methods for validating data. Used heavily on userController.validateRegister
app.use(expressValidator());

// populates req.cookies with any cookies that came along with the request
app.use(cookieParser());

// Sessions allow us to store data on visitors from request to request
// This keeps users logged in and allows us to send flash messages
app.use(session({
  secret: process.env.SECRET,
  key: process.env.KEY,
  resave: false,
  saveUninitialized: false,
}));

// // The flash middleware let's us use req.flash('error', 'Shit!'), which will then pass that message to the next page the user requests
app.use(flash());

// pass variables to our templates + all requests
app.use((req, res, next) => {
  res.locals.h = helpers;
  res.locals.flashes = req.flash();
  res.locals.user = req.user || null;
  res.locals.currentPath = req.path;
  next();
});

// promisify some callback based APIs
app.use((req, res, next) => {
  req.login = promisify(req.login, req);
  next();
});

// make sure sitemap.xml works
app.get('/sitemap.xml', function (req, res) {
  sm.toXML((err, xml) => {
    if (err) {
      return res.status(500).end();
    }
    res.header('Content-Type', 'application/xml');
    res.send(xml);
  });
});

// make sure robots.txt works
app.use((req, res, next) => {
  if ('/robots.txt' == req.url) {
    res.type('text/plain')
    res.send("User-agent: *\nDisallow: \nSitemap: https://www.anthropawlogyvet.com/sitemap.xml");
  } else {
    next();
  }
});


// Done with middleware, handle our own routes
app.use('/', routes);

// If above routes didnt work, we 404 them and forward to error handler
app.use(errorHandlers.notFound);

// One of our error handlers will see if these errors are just validation errors
app.use(errorHandlers.flashValidationErrors);

// Otherwise this was a really bad error we didn't expect
if (app.get('env') === 'development') {
  /* Development Error Handler - Prints stack trace */
  app.use(errorHandlers.developmentErrors);
}

// production error handler
app.use(errorHandlers.productionErrors);


// done! we export it so we can start the site in start.js
module.exports = app;
