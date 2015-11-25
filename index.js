var saml2 = require('saml2-js')
var fs = require('fs')
var open = require('open')
var restify = require('restify')
var server = restify.createServer()

server.use(restify.queryParser())
server.use(restify.bodyParser())

var sp_options = {
  entity_id: "http://127.0.0.1:5000/metadata.xml",
  private_key: fs.readFileSync("./certs/local.key").toString(),
  certificate: fs.readFileSync("./certs/local.crt").toString(),
  assert_endpoint: "http://127.0.0.1:5000/?acs",
  force_authn: true,
  auth_context: { comparison: "exact", class_refs: ["urn:oasis:names:tc:SAML:1.0:am:password"] },
  nameid_format: "urn:oasis:names:tc:SAML:2.0:nameid-format:emailAddress",
  sign_get_request: false,
  allow_unencrypted_assertion: true
}

var sp = new saml2.ServiceProvider(sp_options);

// Example use of service provider.
// Call metadata to get XML metatadata used in configuration.
var metadata = sp.create_metadata();


// Initialize options object
var idp_options = {
  sso_login_url: "https://npmo.onelogin.com/trust/saml2/http-post/sso/494337",
  sso_logout_url: "https://npmo.onelogin.com/trust/saml2/http-redirect/slo/494337",
  certificates: [fs.readFileSync("./certs/remote.crt").toString()],
  force_authn: true,
  sign_get_request: false,
  allow_unencrypted_assertion: false
}

// Call identity provider constructor with options
var idp = new saml2.IdentityProvider(idp_options)

sp.create_login_request_url(idp, {}, function(err, login_url, request_id) {
  if (err != null)
    return res.send(500);
  open(login_url)
});


// Endpoint to retrieve metadata
server.get("/metadata.xml", function(req, res) {
  console.log('meta data fetched');
  res.send(sp.create_metadata());
});

server.post('/', function (req, res, next) {
  var options = {request_body: req.params, allow_unencrypted_assertion: true};

  sp.post_assert(idp, options, function(err, saml_response) {
    if (err != null)
      return res.send(500);

    // Save name_id and session_index for logout
    // Note:  In practice these should be saved in the user session, not globally.
    name_id = saml_response.user.name_id;
    session_index = saml_response.user.session_index;
    res.send(saml_response);
  });
});

server.listen(5000, function() {
  console.log('%s listening at %s', server.name, server.url);
});
