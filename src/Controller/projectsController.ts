//const fetch = require("node-fetch");

import { QueryEngine } from "@comunica/query-sparql-file";
import { Algebra, translate } from "sparqlalgebrajs";
import N3 from "n3";
//@ts-ignore
import { parse } from "@frogcat/ttl2jsonld";
//@ts-ignore
import fetch from "node-fetch";
import { time } from "console";

// Currently fails if no Data is found!
// Exchange with fetch?
function streamToString(stream: any): Promise<string> {
  const chunks: any = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk: any) => {
      console.log();
      chunks.push(Buffer.from(chunk));
      return;
    });
    stream.on("error", (err: Error) => {
      reject(err);
    });
    stream.on("end", () => {
      if (chunks.length > 0) {
        resolve(Buffer.concat(chunks).toString("utf8"));
      } else {
        reject("could not find length");
      }
    });
  });
}

function constructJsonArrayMapping(
  responseMap: Object,
  mapping: { [uri: string]: string }
) {
  // Declare Array that should be returned
  let jsonArray: any[] = [];

  // Iterate through the filtered list of results
  for (const [key, value] of Object.entries(responseMap)) {
    // declare single json object and helper variable "v"
    let json: any = {};
    let v: any = value;

    // Check for every entry in the mapping if it occurs in the "value" and add it to the json
    for (let map in mapping) {
      if (v[map]) {
        json[mapping[map]] = v[map][0];
      }
    }
    // Add the json to the Array
    jsonArray.push(json);
  }

  return jsonArray;
}

function constructJsonMapping(
  responseMap: Object,
  mapping: { [uri: string]: [string, Boolean] }
) {
  // Declare Array that should be returned
  let json: any = {};

  // Iterate through the filtered list of results
  for (const [key, value] of Object.entries(responseMap)) {
    // declare single json object and helper variable "v"
    let v: any = value;

    // Check for every entry in the mapping if it occurs in the "value" and add it to the json
    for (let map in mapping) {
      if (v[map]) {
        if (mapping[map][1]) {
          json[mapping[map][0]] = v[map];
        } else {
          json[mapping[map][0]] = v[map][0];
        }
      }
    }
    // Add the json to the Array
  }

  return json;
}

// Filter out all triples whose URI is not in the sources list
function filterByURI(resultJson: any, sources: string[]) {
  let filteredJson: any = {};

  // Iterate through the original results
  for (let binding of resultJson.results.bindings) {
    // Check if the URI (the subject) is included in the sources list. If not dump it!
    if (sources.includes(binding.s.value)) {
      // Check if the filtered json already includes values associated with the subject
      if (filteredJson[binding.s.value]) {
        // Get the value of the Subject
        let tempResponse = filteredJson[binding.s.value];
        // If the Predicate already exists in the value add the Object to the existing array
        if (tempResponse[binding.p.value]) {
          let tempArr = tempResponse[binding.p.value];
          tempArr.push(binding.o.value);
          tempResponse[binding.p.value] = tempArr;
        }
        // If there is no entry for the Predicate add {p:o}. The Object should be an array
        else {
          tempResponse[binding.p.value] = [binding.o.value];
        }
        //
        filteredJson[binding.s.value] = tempResponse;
      }
      // If no values with the subject yet exist create a new entry and add {p:o} as value.
      // Treat the Object as an Array, since multiple objects are possible!
      else {
        let tempResponse = {};
        tempResponse[binding.p.value] = [binding.o.value];
        filteredJson[binding.s.value] = tempResponse;
      }
    }
  }

  return filteredJson;
}

async function constructQuery(query: string, sources: any, req: any, res: any) {
  // Declare Engine to query in
  const myEngine = new QueryEngine();

  console.log("sources", sources);
  console.log("query", query);

  const result = await myEngine.queryQuads(query, {
    sources: sources,
  });

  console.log("Results found");

  const myWriter = new N3.Writer({ format: "application/ld+json" });

  result.on("data", (quad) => {
    console.log(quad);
    myWriter.addQuad(quad);
  });
  result.on("end", () => {
    myWriter.end((error, result) => {
      let jsonLD = parse(result);
      console.log("jsonLD", jsonLD);
      //res.status(200).json(jsonLD);}
    });
    console.log("After LD!");
  });
}

// Default select query function to perform with comunica
async function selectQuery(query: string, sources: any, req: any, res: any) {
  // Declare Engine to query in
  const myEngine = new QueryEngine();
  console.log("Start select");
  console.log("sources", sources);

  // Perform query and wait for the results
  const QueryResults = await myEngine
    .query(query, {
      sources: sources,
      fetch: req.fetch,
    })
    .then((result: any) => {
      let time_: any = new Date();
      console.log(time_);
      return myEngine.resultToString(result, "application/sparql-results+json");
    })
    .then((result) => {
      let time_: any = new Date();
      console.log(time_);
      return streamToString(result["data"]);
    })
    .then((e) => {
      // Parse the results to json and return them
      console.log("e", e);
      return JSON.parse(e);
    })
    .catch((error) => {
      // If function fails the error should be forwarded to the client who did the request
      res.status(401).json(error);
    });

  return QueryResults;
}

// Use this function if the select query had just one variable and you want to push all the results to an array
function singleSelectResultToArray(result: any, binding: string) {
  let resultArray: any = [];
  for (const project of result.results.bindings) {
    let projectURL = project[binding].value;
    resultArray.push(projectURL);
  }
  return resultArray;
}

async function findWebIdsSparqlEndpoint(req: any, res: any) {
  // Find the SPARQL satellite in the users Pod
  const endpointQuery = `
      SELECT ?sparqlEndpoint
      WHERE {
        ?s <https://w3id.org/lbdserver#hasSparqlSatellite> ?sparqlEndpoint
      }
    `;
  console.log("WebId", req.auth.webId);
  const selectEndpoints = await selectQuery(
    endpointQuery,
    [req.auth.webId],
    req,
    res
  );

  console.log("selectEndpoints", JSON.stringify(selectEndpoints));

  let endpointSources: any = singleSelectResultToArray(
    selectEndpoints,
    "sparqlEndpoint"
  );

  console.log("endpointSources", endpointSources);
  return endpointSources;
}

async function findParticipatingProjects(req: any, res: any, sources: any) {
  console.log("Participating Sources", sources);
  const participatesQuery = ` 
  SELECT ?project
  WHERE {
    <${req.auth.webId}> <http://lbd.arch.rwth-aachen.de/bcfOWL#participatesIn> ?project .
  }
  `;

  console.log("participates Query", participatesQuery);
  const selectParticipatesIn = await selectQuery(
    participatesQuery,
    sources,
    req,
    res
  );
  console.log("selectParticipatesIn", JSON.stringify(selectParticipatesIn));
  // Query all the projects the users participates in for their access URLs (SPARQL satellites)
  let projectSources: any = singleSelectResultToArray(
    selectParticipatesIn,
    "project"
  );

  return projectSources;
}

async function findParticipatingProjectsSatellites(
  req: any,
  res: any,
  sources: any
) {
  console.log("satelliteSources", sources);
  const satelliteQuery = `
  SELECT ?endpoint
  WHERE {
    ?s a <http://lbd.arch.rwth-aachen.de/bcfOWL#Project>;
     <https://www.w3.org/ns/dcat#accessURL> ?endpoint .
  }
`;

  const selectAccessURL = await selectQuery(satelliteQuery, sources, req, res);

  // Select all values from the bcfOWL:Projects
  let projectEndpointSources: any = singleSelectResultToArray(
    selectAccessURL,
    "endpoint"
  );

  return projectEndpointSources;
}

async function initQueriesHelper(req, res) {
  // Query the users SPARQL endpoint to see in what BCF projects he/she is participating in
  let endpointSources: any = await findWebIdsSparqlEndpoint(req, res);
  console.log("Start!");
  let projectSources: any = await findParticipatingProjects(
    req,
    res,
    endpointSources
  );
  console.log("Start 2!");
  let projectsSatellites: any = await findParticipatingProjectsSatellites(
    req,
    res,
    projectSources
  );
  console.log("Start 3!");
  return { endpoints: projectsSatellites, sources: projectSources };
}

// Get Projects request as defined by "https://github.com/buildingSMART/BCF-API#311-get-projects-service"
exports.GetProjects = async (req: any, res: any, next: any) => {
  // Check if a webId if provided
  if (req.auth.webId != undefined) {
    let initQueries = await initQueriesHelper(req, res);

    console.log("endpoints", initQueries.endpoints);
    const projectQuery = `
      SELECT ?s ?p ?o
      WHERE {
        ?s a <http://lbd.arch.rwth-aachen.de/bcfOWL#Project>;
         ?p ?o .
      }
    `;

    const selectProjects = await selectQuery(
      projectQuery,
      initQueries.endpoints,
      req,
      res
    );

    // Filter out all responses that were not asked for!
    // Should usually not be necessary but is a helper function if the pod is a bit chaotic...
    let projectsResponse: any = filterByURI(
      selectProjects,
      initQueries.sources
    );

    // Filter the responses for the values that are asked for by the BCF APIs corresponding Route
    // In this case the BCF API only wants the GUID and the Name as a response
    let jsonResponseArr: any[] = constructJsonArrayMapping(projectsResponse, {
      "http://lbd.arch.rwth-aachen.de/bcfOWL#hasGUID": "project_id",
      "http://lbd.arch.rwth-aachen.de/bcfOWL#hasName": "name",
    });

    res.status(200).json(jsonResponseArr);
  }
};

exports.GetSingleProject = async (req: any, res: any, next: any) => {
  // Check if a webId if provided
  if (req.auth.webId != undefined) {
    let initQueries = await initQueriesHelper(req, res);

    // const projectQuery = `
    //     SELECT ?s ?p ?o
    //     WHERE {
    //       ?s a <http://lbd.arch.rwth-aachen.de/bcfOWL#Project>;
    //         <http://lbd.arch.rwth-aachen.de/bcfOWL#hasGUID> "${req.params.project_id}";
    //         ?p ?o .
    //     }
    //   `;

    // const selectProjects = await selectQuery(
    //   projectQuery,
    //   initQueries.endpoints,
    //   req,
    //   res
    // );

    const projectQuery = `
    CONSTRUCT {?s ?p ?o}
    WHERE {
      ?s a <http://lbd.arch.rwth-aachen.de/bcfOWL#Project>;
        <http://lbd.arch.rwth-aachen.de/bcfOWL#hasGUID> "${req.params.project_id}";
        ?p ?o .
    }
  `;

    const constructProjects = await constructQuery(
      projectQuery,
      initQueries.endpoints,
      req,
      res
    );

    // Filter out all responses that were not asked for!
    // Should usually not be necessary but is a helper function if the pod is a bit chaotic...
    // let projectsResponse: any = filterByURI(
    //   selectProjects,
    //   initQueries.sources
    // );

    // // Filter the responses for the values that are asked for by the BCF APIs corresponding Route
    // // In this case the BCF API only wants the GUID and the Name as a response
    // let jsonResponse: any[] = constructJsonMapping(projectsResponse, {
    //   "http://lbd.arch.rwth-aachen.de/bcfOWL#hasGUID": ["project_id", false],
    //   "http://lbd.arch.rwth-aachen.de/bcfOWL#hasName": ["name", false],
    // });

    // res.status(200).json(jsonResponse);
  }
};

exports.GetExtensions = async (req: any, res: any, next: any) => {
  // Check if a webId if provided
  if (req.auth.webId != undefined) {
    let initQueries = await initQueriesHelper(req, res);

    const projectQuery = `
        SELECT ?s ?p ?o
        WHERE {
          ?s a <http://lbd.arch.rwth-aachen.de/bcfOWL#Project>;
            <http://lbd.arch.rwth-aachen.de/bcfOWL#hasGUID> "${req.params.project_id}";
            ?p ?o .
        }
      `;

    const selectProjects = await selectQuery(
      projectQuery,
      initQueries.endpoints,
      req,
      res
    );

    // Filter out all responses that were not asked for!
    // Should usually not be necessary but is a helper function if the pod is a bit chaotic...
    let projectsResponse: any = filterByURI(
      selectProjects,
      initQueries.sources
    );

    // Filter the responses for the values that are asked for by the BCF APIs corresponding Route
    // In this case the BCF API only wants the GUID and the Name as a response
    let jsonResponse: any[] = constructJsonMapping(projectsResponse, {
      "http://lbd.arch.rwth-aachen.de/bcfOWL#hasTopicType": [
        "topic_type",
        true,
      ],
      "http://lbd.arch.rwth-aachen.de/bcfOWL#hasTopicStatus": [
        "topic_status",
        true,
      ],
      "http://lbd.arch.rwth-aachen.de/bcfOWL#hasUsers": ["users", true],
      "http://lbd.arch.rwth-aachen.de/bcfOWL#hasLabel": ["topic_label", true],
      "http://lbd.arch.rwth-aachen.de/bcfOWL#hasPriority": ["priority", true],
      "http://lbd.arch.rwth-aachen.de/bcfOWL#hasStage": ["stage", true],
    });

    res.status(200).json(jsonResponse);
  }
};

// const url = mySources[0] + "?query=" + projectsQuery;
// let urlen = encodeURI(url);
// urlen = urlen.replace("#", "%23");

// console.log(urlen);

// // Construct the request Options
// var requestOptions: any = {
//   method: "GET",
//   headers: { accept: "application/sparql-results+json" },
//   redirect: "follow",
// };

// req
//   .fetch(urlen, requestOptions)
//   .then((response: any) => response.json())
//   .then((result: any) => {
//     console.log(result);
//     res.status(200).json(result);
//   })
//   .catch((error) => {
//     console.log("error", error);
//   })
