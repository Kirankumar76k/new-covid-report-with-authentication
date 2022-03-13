const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("Server running successfully at http://localhost:3001/");
    });
  } catch (error) {
    console.log(`DB Error at ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "kkkkk", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//login

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const getQuery = `select * from user where username = '${username}';`;
  const DbQuery = await db.get(getQuery);
  if (DbQuery === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isMatch = await bcrypt.compare(
      request.body.password,
      DbQuery.password
    );
    if (isMatch === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "kkkkk");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const getAllStateDetails = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

//Returns a list of all states in the state table

app.get("/states/", authenticateToken, async (request, response) => {
  const getQuery = `select * from state;`;
  const dbResponse = await db.all(getQuery);
  response.send(dbResponse.map((eachItem) => getAllStateDetails(eachItem)));
  //   response.send(dbResponse);
});

app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getQuery = `select * from state where state_id = ${stateId};`;
  const dbResponse = await db.get(getQuery);
  response.send(getAllStateDetails(dbResponse));
  //   response.send(dbResponse);
});

app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const getQuery = `insert into district
  (district_name,state_id,cases,cured,active,deaths)
    values(
        '${districtName}',
        '${stateId}',
        '${cases}',
        '${cured}',
        '${active}',
        '${deaths}'
        );`;
  const dbResponse = await db.run(getQuery);
  response.send("District Successfully Added");
});
//
const convertDistrictDbToResponseDbObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getQuery = `select * from district where district_id = ${districtId};`;
    const dbResponse = await db.get(getQuery);
    response.send(convertDistrictDbToResponseDbObject(dbResponse));
    // response.send(dbResponse);
  }
);

//
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getQuery = `delete from district where district_id = ${districtId};`;
    const dbResponse = await db.run(getQuery);
    response.send("District Removed");
  }
);

//
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const getQuery = `update district set
        
       district_name = '${districtName}',
       state_id = '${stateId}',
       cases = '${cases}',
       cured = '${cured}',
       active = '${active}',
       deaths = '${deaths}'
         where district_id = ${districtId};`;
    const dbResponse = await db.run(getQuery);
    response.send("District Details Updated");
  }
);

//

const convertTotalStateDbObjectToResponseObject = (dbObject) => {
  return {
    totalCases: dbObject.totalCases,
    totalCured: dbObject.totalCured,
    totalActive: dbObject.totalActive,
    totalDeaths: dbObject.totalDeaths,
  };
};
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getQuery = `select sum(cases) as totalCases,
  sum(cured) as totalCured,
  sum(active) as totalActive,
  sum(deaths) as totalDeaths from district where state_id = ${stateId};`;
    const dbResponse = await db.get(getQuery);
    response.send(convertTotalStateDbObjectToResponseObject(dbResponse));
    // response.send(dbResponse);
  }
);

module.exports = app;
