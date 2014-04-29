define(['jquery', 'JSON'], function($) {

  /*
    notice: response.headers is just a string (seperated with \r\n i think)
    body can be the already converted response from jquery but it is not converted in alle cases with an error
  */

  return function () {
    var that = this;

    this.dispatch = function(method, url, data, callback) {
      method = method.toUpperCase();

      /* globals ActiveXObject */
      var params = {
        url: url,
        type: method,
        dataType: "json",
        processData: method === 'GET',
        contentType: 'application/json; charset=UTF-8',
        data: method === 'GET' ? data : JSON.stringify(data), // GET data is the query string
        success: function (data, textStatus, jqXHR) {
          var response = that.responseFromXHR(jqXHR, data);

          callback(undefined, response);
        },
        error: function(jqXHR) {
          // are here errors that do not have a jqXHR server response?
          var response = that.responseFromXHR(jqXHR);

          callback(undefined, response);
        }
      };

      // If we're sending a `PATCH` request, and we're in an old Internet Explorer
      // that still has ActiveX enabled by default, override jQuery to use that
      // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
      if (params.type === 'PATCH' || params.type === 'DELETE') {

        if (window.ActiveXObject && !(window.external && window.external.msActiveXFilteringEnabled)) {
          params.xhr = function() {
            return new ActiveXObject("Microsoft.XMLHTTP");
          };
        } else if(!that.hasPatchMethod()) {
          // enable this in symfony in framework config: http_method_override
          params.headers = {'X-HTTP-METHOD-OVERRIDE': params.type};
          params.type = 'post';

        }
      }

      // evil workaround this: https://github.com/assaf/zombie/issues/670
      if (params.data === undefined && method !== 'GET' && (window.navigator.userAgent) && window.navigator.userAgent.match('Zombie')) {
        params.data = '{"___empty-zombie-fake-data":"added-from-knockout-sync"}';
      }

      $.ajax(params);
    };

    this.responseFromXHR = function(jqXHR, convertedBody) {
      var response = {
        code: jqXHR.status,
        body: convertedBody || jqXHR.responseText,
        rawBody: jqXHR.responseText,
        headers: jqXHR.getAllResponseHeaders(),
        statusText: jqXHR.statusText
      };

      return response;
    };

    this.hasPatchMethod = function() {
      return false;
    };
  };

});