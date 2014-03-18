define(['jquery', 'JSON'], function($, undef) {

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
        success: function (data, jqXHR) {
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
      return {
        code: jqXHR.statusCode(),
        body: convertedBody || jqXHR.responseText,
        rawBody: jqXHR.responseText,
        headers: jqXHR.getAllResponseHeaders()
      };
    };
  };

});