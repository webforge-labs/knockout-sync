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
          throw new Error('implement that tomorrow');
          var response = that.responseFromXHR(jqXHR);

          callback(undefined, response);
        },
        error: function(jqXHR, textStatus, errorThrown) {
        );

        }
      });
    };

    this.responseFromXHR = function(jqXHR) {
      return {
        code: jqXHR.statusCode(),
        body: jqXHR.responseText,
        headers: jqXHR.getAllResponseHeaders()
      };
    }
  };

});