# solid-template-satellite-express

Template for creating a Solid Express App that can communicate with the [Fuseki satellite](https://github.com/LBD-Hackers/lbdserver-sparql-satellite) and additional databases.

# Set up

## Step 1:
Use your terminal to install all modules
`npm install`
## Step 2:
Create a nodemon.json and add your environment variables
### Step 2.1: 
Add you solid credentials to the environment.
```{
  "env": {
    "ACCOUNT": {"email": "schulz@dc.rwth-aachen.de", "password":"login1", "idp":"http://localhost:3000"},
    "PORT": 3080,
  }
}```

## Step 3:
Run the application
`npm start`
