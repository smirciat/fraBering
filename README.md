# workspace

This project was generated with the [Angular Full-Stack Generator](https://github.com/DaftMonk/generator-angular-fullstack) version 3.8.0.

## Key Frameworks/Tools

- [AngularJS](https://angularjs.org)
- [Sequelize (connected to PostgreSQL database)](https://sequelize.org/)
- [PostgreSQL v13](https://www.postgresql.org/)
- [Grunt](http://gruntjs.com/)
- [NodeJS v10](https://nodejs.org/en)

## Getting Started

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js and npm](nodejs.org) Node ^4.2.3, npm ^2.14.7
- [Bower](bower.io) (`npm install --global bower`)
- [Grunt](http://gruntjs.com/) (`npm install --global grunt-cli`)
- [SQLite](https://www.sqlite.org/quickstart.html)

### Developing

1. Run `npm install` to install server dependencies.
  --use node 4 for first run through, may need to insall python ~2.7 to make it work
  --use node 6 and run `npm install` again
  --finally, use node 10 and run `npm install`

2. Run `bower install` to install front-end dependencies.
  --some bower components may not automatically install.  They will need to be added manually after viewing the console  
      errors that appear
  --will need local versions of development.js, local.env.js, and firebase.json files to get server running without errors

3. Run `grunt serve` to start the development server. It should automatically open the client in your browser when ready.

## Build & development

Run `grunt build` for building and `grunt serve` for preview.

## Testing

Running `npm test` will run the unit tests with karma.
