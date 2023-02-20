## Prerequsites
- Node v14+
- MySQL 5.6

## Installation

- Run `npm install`
- Create a local MySQL database called `antinomy`
- Copy `.env.example` and rename it `.env`
- Enter the database credentials in the `.env` file
- Run `npm run migrate` to create all tables in the database
- Run `npm run seed` to populate the database with required information

*It is recommended to use [MAMP](https://www.mamp.info/) to run your database.

## Available Scripts

### `npm start`

Runs the app in development mode. This will start a server on [http://localhost:3000](http://localhost:3000).

### `npm test`

Runs al the tests.

### `npm run migrate`

Runs all migrations to create tables in the database.

### `npm run migrate:rollback`

Rolls back the last migration.

### `npm run migrate:rollback:all`

Rolls back all migrations.

### `npm run seed`

Runs all seeds to populate the database with information.

### `sequelize db:seed --seed [seed-name]` 

Runs a specific seed

### `sequelize db:seed:undo --seed [seed-name]` 

Rolls back a specific seed

### `sequelize migration:generate --name [migration-name]`

Generates a new migration file

### `sequelize seed:generate --name [seed-name]`

Generates a new seed file
