# workspace

This project was generated with the [Angular Full-Stack Generator](https://github.com/DaftMonk/generator-angular-fullstack) version 3.8.0.

## Key Frameworks/Tools

- [AngularJS](https://angularjs.org)
- [Sequelize (connected to PostgreSQL database)](https://sequelize.org/)
- [PostgreSQL v13](https://www.postgresql.org/)
- [Grunt](http://gruntjs.com/)
- [NodeJS v12](https://nodejs.org/en)

## Getting Started

### Prerequisites

- [Git](https://git-scm.com/)
- [Node.js and npm](nodejs.org) Node ^12.22.12 npm ^6.14.16
- [Bower](bower.io) (`npm install --global bower`)
- [Grunt](http://gruntjs.com/) (`npm install --global grunt-cli`)
- [SQLite](https://www.sqlite.org/quickstart.html) (unless PostgreSQL is installed)

### Developing

Run `npm install` to install server dependencies.
  1. Ensure package-lock.json file is present.
  2. Temporarily remove line from package.json under scripts>preinstall.  This is related to npx.
  3. Use node 4 for first run through, may need to insall python ~2.7 and run `npm config set python ~/.pyenv/versions/2.7.18/bin/python` to make it work.
  4. Use node 6 and run `npm install` again.
  5. Restore previously deleted line from package.json.
  6. Finally, use node 12 and run `npm install`.

Run `bower install` to install front-end dependencies.
  1. some bower components may not automatically install.  They will need to be added manually after viewing the console  
      errors that appear
  2. will need local versions of development.js, local.env.js, and firebase.json files to get server running without errors

Run `grunt serve` to start the development server. It should automatically open the client in your browser when ready.

## Build & development

Run `grunt build` for building and `grunt serve` for preview.

1.  For production, run `grunt build` after any changes
2.  After successful build, navigate to /dist folder and run `npm start`

## Testing

Running `npm test` will run the unit tests with karma.
