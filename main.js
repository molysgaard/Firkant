document.ready = function(){
  window.a = new Ampache('http://lysgaard.dyndns.org/ampache', 'chrome', 'chrome');
  a.uiSetup();
  a.bind();
  a.lib.authenticate();
}

