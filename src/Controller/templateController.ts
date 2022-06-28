
// Example GET request handling
exports.TemplateGet = async (req: any, res: any, next:any) => {
  // simple implementation of a response to the client, where we check if a webId was associated to the request.
  // If yes, send a positive response, if no send an error
  if (req.auth.webId != undefined) {
    res.status(200).json({congratulations: `${req.auth.webId} successfully performed a GET request`})
  } else {
    res.status(404).json({error: `Cannot find any webId related to the request`})
  }

  // Example GET Request to a another Fuseki DB:
  /*
  var myHeaders = new fetch.Headers();
  myHeaders.append("Content-Type", "application/x-www-form-urlencoded");
  myHeaders.append("Authorization", process.env.EXAMPLE_FUSEKI_ACCESS);

  // If you want to take over the headers from the clients request you can forward them to the query to the database
  // In this example we can forward the desirded format (e.g. ttl) with the "Accept" header.
  if (req.headers.accept) {
    myHeaders.append("Accept", req.headers["accept"]);
  }

  var urlencoded = new URLSearchParams();

  // Forward the query from the client to the Fuseki server
  urlencoded.append("query", req.body.query);

  // Construct the request Options
  var requestOptions = {
    method: "POST",
    headers: myHeaders,
    body: urlencoded,
    redirect: "follow",
  };

  // Forward the request to Fuseki and return the Fuseki response to the client
  fetch(process.env.FUSEKI_URL + projectId, requestOptions, requestOptions)
    .then((response) => response.json())
    .then((result) => {
      res.status(200).json(result);
    })
    .catch((error) => {
      console.log("error", error);
    });

  */
};

exports.TemplatePost = async (req: any, res: any, next:any) => {
  if (req.auth.webId != undefined) {
    res.status(200).json({congratulations: 
      `${req.auth.webId} successfully performed a POST request with following values: ${JSON.stringify(req.body)}`})
  } else {
    res.status(404).json({error: `Cannot find any webId related to the request`})
  }
};

exports.TemplatePut = async (req: any, res: any, next:any) => {
  if (req.auth.webId != undefined) {
    res.status(200).json({congratulations: 
      `${req.auth.webId} successfully performed a PUT request with following values: ${JSON.stringify(req.body)}`})
  } else {
    res.status(404).json({error: `Cannot find any webId related to the request`})
  }
};
