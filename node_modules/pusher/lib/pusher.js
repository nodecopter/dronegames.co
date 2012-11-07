module.exports = (function(){
  var crypto = require('crypto'),
      http = require('http'),
      sys = require('sys');

  var Pusher = function(options) {
    this.options = options;

    return this;
  }

  Pusher.prototype.domain = 'api.pusherapp.com';

  Pusher.prototype.channel = function(channel) {
    if(typeof channel === 'undefined') return this.options.channel;
    this.options.channel = channel;

    return this;
  }

  Pusher.prototype.trigger = function(event, data, socketId, callback) {
    if (typeof socketId === 'function') {
      callback = socketId;
      socketId = undefined;
    }
    this.event = event;
    this.data  = new Buffer(JSON.stringify(data));
    this.socketId = socketId;
    this.send(callback);

    return this;
  }

  Pusher.prototype.send = function(callback) {
    var client = http.createClient(80, this.domain);
    var request = client.request('POST', this.path(), {
      'host': this.domain,
      'Content-Type': 'application/json',
      'Content-Length': this.data.length
    });

    if(callback) {
      client.addListener('error', function(error) {
        callback(error, request, null);
      });

      request.addListener('response', function(response) {
        callback(null, request, response);
      });
    }

    request.write(this.data);
    request.end();

    return request;
  }

  Pusher.prototype.path = function() {
    return this.uri() + '?' + this.queryString() + '&auth_signature=' + this.signature();
  }

  Pusher.prototype.uri = function() {
    return '/apps/' + this.options.appId + '/channels/' + this.options.channel + '/events';
  }

  Pusher.prototype.queryString = function() {
    var timestamp = parseInt(new Date().getTime() / 1000);
    var parts = [
      'auth_key=',        this.options.appKey,
      '&auth_timestamp=', timestamp,
      '&auth_version=',   '1.0',
      '&body_md5=',       this.hash(),
      '&name=',           this.event
    ];

    if (this.socketId) {
      parts.push('&socket_id=', this.socketId);
    }

    return parts.join('');
  }

  Pusher.prototype.hash = function() {
    return crypto.createHash('md5').update(this.data).digest("hex");
  }

  Pusher.prototype.signature = function(uri, queryString) {
    var signData = ['POST', this.uri(), this.queryString()].join('\n');

    return crypto.createHmac('sha256', this.options.secret).update(signData).digest('hex');
  }

  return Pusher;
})();