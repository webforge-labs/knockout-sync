define(['jquery', 'JSON'], function($, undef) {

  return function () {

    this.dispatch = function(method, url, data, callback) {
      $.ajax({
        url: url,
        type: method, // TODO put and delete?
        dataType: "json",
        processData: false,
        contentType: 'application/json; charset=UTF-8',
        data: JSON.stringify(data),
        success: function (response) {
          callback(undefined, response);
        }
      });
    };
  };

});