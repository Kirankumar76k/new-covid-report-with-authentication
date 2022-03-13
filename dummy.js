const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

let db = null;

const convertMatchDetailsDbObjectToResponseObject = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running successfully at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error at ${error.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const getAllStateDetails = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

//Returns a list of all states in the state table

app.get("/states/", async (request, response) => {
  const getQuery = `select * from state;`;
  const dbResponse = await db.all(getQuery);
  response.send(dbResponse.map((eachItem) => getAllStateDetails(eachItem)));
});

//Returns a state based on the state ID

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getQuery = `select * from state where state_id = ${stateId};`;
  const dbResponse = await db.get(getQuery);
  response.send(getAllStateDetails(dbResponse));
});

//

app.post("/districts/", async (request, response) => {
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

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getQuery = `select * from district where district_id = ${districtId};`;
  const dbResponse = await db.get(getQuery);
  response.send(convertDistrictDbToResponseDbObject(dbResponse));
});

//
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getQuery = `delete from district where district_id = ${districtId};`;
  const dbResponse = await db.run(getQuery);
  response.send("District Removed");
});

//
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
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
});

//

const convertTotalStateDbObjectToResponseObject = (dbObject) => {
  return {
    totalCases: dbObject.totalCases,
    totalCured: dbObject.totalCured,
    totalActive: dbObject.totalActive,
    totalDeaths: dbObject.totalDeaths,
  };
};
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getQuery = `select sum(cases) as totalCases,
  sum(cured) as totalCured,
  sum(active) as totalActive,
  sum(deaths) as totalDeaths from district where state_id = ${stateId};`;
  const dbResponse = await db.get(getQuery);
  response.send(convertTotalStateDbObjectToResponseObject(dbResponse));
});

//
const convertStateDbObjectToResponseObject = (dbObject) => {
  return {
    stateName: dbObject.stateName,
  };
};

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getQuery = `select state.state_name as stateName from state inner join district on state.state_id = district.state_id where district.district_id = ${districtId};`;
  const dbResponse = await db.get(getQuery);
  const re = convertStateDbObjectToResponseObject(dbResponse);
  response.send(re);
  console.log(dbResponse);
});

module.exports = app;
