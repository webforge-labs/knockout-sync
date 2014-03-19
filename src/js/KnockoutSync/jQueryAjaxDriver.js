define(['jquery', 'JSON'], function($, undef) {

  /*
    notice: response.headers is just a string (seperated with \r\n i think)
    body can be the already converted response from jquery but it is not converted in alle cases with an error
  */

  return function () {
    var that = this;

    this.dispatch = function(method, url, data, callback) {
      $.ajax({
        url: url,
        type: method, // TODO put and delete?
        dataType: "json",
        processData: false,
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(data),
        success: function (data, textStatus, jqXHR) {
          var response = that.responseFromXHR(jqXHR, data);

          callback(undefined, response);
        },
        error: function(jqXHR, textStatus, errorThrown) {
          // are here errors that do not have a jqXHR server response?
          var response = that.responseFromXHR(jqXHR);

          callback(undefined, response);
        }
      });
    };

    this.responseFromXHR = function(jqXHR, convertedBody) {
      var response = {
        code: jqXHR.status,
        body: convertedBody || jqXHR.responseText,
        rawBody: jqXHR.responseText,
        headers: jqXHR.getAllResponseHeaders()
      };

      return response;
    };
  };

});