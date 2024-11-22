## Prerequsites
- Node v18+
- MySQL 8.0+

## Installation

- Run `npm install`
- Create a local MySQL database called `ethnos`
- Copy `.env.example` and rename it `.env`
- Enter the database credentials in the `.env` file
- Run `npm run migrate` to create all tables in the database
- Run `npm run seed` to populate the database with required information

*It is recommended to use [MAMP](https://www.mamp.info/) to run your database.

## Available Scripts

#### `npm start`

Runs the app in development mode. This will start a server on [http://localhost:3000](http://localhost:3000).

#### `npm test`

Runs all the tests.

#### `npm run test -t [filename].test.ts`

Runs a single test file

#### `npm run test:coverage`

Runs all the tests and generates a coverage report.

#### `npm run migrate`

Runs all migrations to create tables in the database.

#### `npm run migrate:rollback`

Rolls back the last migration.

#### `npm run migrate:rollback:all`

Rolls back all migrations.

#### `npm run seed`

Runs all seeds to populate the database with information.

#### `sequelize db:seed --seed [seed-name]` 

Runs a specific seed

#### `sequelize db:seed:undo --seed [seed-name]` 

Rolls back a specific seed

#### `sequelize migration:generate --name [migration-name]`

Generates a new migration file

#### `sequelize seed:generate --name [seed-name]`

Generates a new seed file

# Deployment

### Server Setup
On the production server:

- Prerequisites
    - ubuntu 20.04/22.04

- Install the following packages:
    - update ubuntu packages:
        - sudo apt update
    - nvm:
        - curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
        - export NVM_DIR="$HOME/.nvm"
        - [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        - [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
        - You can now install node via nvm as well:
    - nodejs:
        - nvm install 18
    - pm2:
        - npm install -g @socket.io/pm2
    - nginx:
        - sudo apt install nginx
        - sudo ufw allow 'Nginx Full'
    - git:
        - sudo apt install git
    - unzip:
        - sudo apt install unzip
    - update the timezone:
        - timedatectl set-timezone UTC
    - mysql:
        - sudo apt update
        - sudo apt install mysql-server
        - sudo systemctl start mysql.service
        - sudo mysql_secure_installation

    - database config:
        - sudo mysqld stop
        - sudo mysqld start --skip-grant-tables
        - sudo mysql
        - `> use mysql;`
        - `> update user set authentication_string=password('[password]') where user='root';`
        - `> FLUSH PRIVILEGES;`
        - `> exit`
    - create a new database:
        - mysql -u root -p
        - enter password
        - `CREATE DATABASE [database-name];`
    - create a new user:
        - mysql -u root -p
        - enter password
        - `> CREATE USER '[username]'@'localhost' IDENTIFIED BY '[password]';`
        - `> GRANT ALL PRIVILEGES ON [database-name].* TO '[username]'@'localhost';`
        - `> exit`

### Nginx Configuration

1. Navigate to the `sites-available` folder:
    - `cd /etc/nginx/sites-available`
2. Rename the default configuration file:
    - `sudo mv default _default`
2. Create a new configuration file:
    - `sudo touch default`
3. Edit the configuration file:
    - `sudo vim default`
4. Copy the settings from `./nginx_config` on this repo
5. Restart the nginx service:
    - `sudo service nginx restart`

### Installing an SSL Certificate with Certbot

- sudo apt-get update
- sudo apt-get install software-properties-common
- sudo add-apt-repository universe
- sudo add-apt-repository ppa:certbot/certbot
- sudo apt-get update
- sudo apt-get install certbot python3-certbot-nginx
- sudo certbot --nginx
- sudo service nginx restart

* Ensure your domain's DNS is pointing to the server IP

See full instructions [here][certbot].

### Deploying the app

The application is deployed via Git.

On the production server:

- Create the project's directory:
    - `mkdir /var/www/api`

- Navigate into the project's directory:
    - `cd /var/www/api`

- Clone the app inside the `api` folder:
    - `git clone https://github.com/sprucegoose-dev/ethnos-be.git .`

- Run `npm install`

- Copy `.env.example` as `.env`:
    - `cp .env.example .env`

- Enter the database credentials in the `.env` file

- Set the `NODE_ENV` variable to `production`

- Run `npm run migrate`

- Run `npm run seed`

- Build the project
    - `npm run build`

- Start the server as a background process:
    - `npm run start-pm2`

- To restart the process after an update:
    - `pm2 reload api`
    OR  
    - `npm run stop-pm2; npm run start-pm2`
