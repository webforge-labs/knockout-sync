define(['tests/chai', 'jquery', 'src/js/KnockoutSync/jQueryAjaxDriver'], function(chai, $, JQueryAjaxDriver) {

  return function(before, after, sinon) {
    var expect = chai.expect;
    var driver = new JQueryAjaxDriver();

    describe("jQueryAjaxDriver", function() {
      var xhr, requests;

      before(function () {
        //ich xhr = sinon.useFakeXMLHttpRequest();
        this.server = sinon.fakeServer.create();
        //requests = [];
        //xhr.onCreate = function (req) { requests.push(req); };
      });

      after(function () {
        //xhr.restore();
        this.server.restore();
      });

      it("makes a GET request for todo items", function () {
        this.server.respondWith("GET", "/something", [
          200, 
          { "Content-Type": "application/json" },
          '[{ "id": 12, "comment": "Hey there" }]'
        ]);

        console.log(sinon);
        var callback = sinon.spy();

        driver.dispatch("GET", "/something", {active: "true"}, callback);
        this.server.respond();

        sinon.assert.calledWith(callback, [{ id: 12, comment: "Hey there" }]);
      });
    });
  };

});