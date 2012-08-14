document.ready = function(){
  var save = function(event){
    var url = $('#url').val();
    var user = $('#user').val();
    var pass = $('#password').val();
    window.localStorage.setItem('auth', JSON.stringify({'url':url, 'user':user, 'passwordDigest':SHA256(pass)}));
    window.location = 'main.html';
  }

  var fillUI = function(){
    auth = JSON.parse(window.localStorage.getItem('auth'));
    if(auth){
      $('#url').val(auth.url);
      $('#user').val(auth.user);
      $('#password').val(auth.password);
    }
  }

  window.l = new Library('http://lysgaard.dyndns.org/ampache', 'chrome', 'chrome');
  fillUI();
  $('#flushCache').click(l.flushCache);
  $('#save').click(save);
}
