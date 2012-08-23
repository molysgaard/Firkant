document.ready = function(){
  window.a = new Ampache('http://lysgaard.dyndns.org/ampache', 'chrome', 'chrome');
  a.uiSetup();
  a.bind();
  var prom = a.lib.authenticate();
  var readData = $.proxy(a.lib.authCallback, a.lib);
  var retry = $.proxy(a.lib.authenticate, a.lib);
  prom.done(function(data){a.lib.fetchCallback(data, readData, retry)});
  prom.fail(function(e){
    console.log(e);
    if(navigator.onLine){
      window.location = 'options.html'; 
      alert('The server url you entered could not be reached. Have you remembered to prepend the address with http:// ?');
    }
  });
}

