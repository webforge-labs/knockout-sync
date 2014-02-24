var chai = require('chai');
var expect = chai.expect;
var requirejs = require('requirejs');
var _ = require('lodash');
var jsonModel = require('../model-compiled.json');

var config = require('../../../lib/js/config.js');

requirejs.config(
  _.extend(config, {
      nodeRequire: require,
      baseUrl: "src/js", // seems to be relative to the dir where mocha is called
    }
  )
);

var Backend = requirejs('KnockoutSync/Backend');
var UserModel = requirejs('ACME/Blog/Entities/UserModel');
var EntityModel = requirejs('KnockoutSync/EntityModel');
var AjaxDriver = function() {
};

describe('Yield Deploy Backend', function() {
  var backend, driver, model;

  beforeEach(function() {
    model = new EntityModel(jsonModel);
    backend = new Backend(driver = new AjaxDriver(), model);
  });

  it("cannot be created without the entity model or the driver", function() {
    expect(function() {
      new Backend();

    }).to.throw (Error, 'Provide the entity model');

  });

  it("cannot be created without the driver", function() {
    expect(function() {
      new Backend(undefined, model);

    }).to.throw (Error, 'Provide the driver');

  });

  it("saves a new entity per driver (ajax)", function() {
    var dispatched = false;

    var user = new UserModel({name: 'Ross', email: 'ross@ps-webforge.com', id: undefined});

    driver.dispatch = function(method, url, data, callback) {
      dispatched = true;
      expect(method, 'method').to.be.equal('post');
      expect(url, 'url').to.be.equal('/api/users');
      expect(data, 'data').to.be.eql(user.serialize());

      data.id = 7;

      callback(undefined, data);
    };

    backend.save(user);
    expect(dispatched, 'dispatch is called').to.be.true;

    expect(user.id(), 'user.id').to.be.equal(7);
  });

  it("saves an existing entity per driver (ajax)", function() {
    var dispatched = false;

    var user = new UserModel({name: 'Ross', email: 'ross@ps-webforge.net', id: 7});

    driver.dispatch = function(method, url, data, callback) {
      dispatched = true;
      expect(method, 'method').to.be.equal('put');
      expect(url, 'url').to.be.equal('/api/user/7');
      expect(data, 'data').to.be.eql(user.serialize());

      callback(undefined, data);
    };

    backend.save(user);
    expect(dispatched, 'dispatch is called').to.be.true;
    expect(user.id(), 'user.id').to.be.equal(7);
  });

  it("queries a collection of entities", function() {
    var dispatched = false;

    var user1 = new UserModel({name: 'Ross', email: 'ross@ps-webforge.net', id: 7});
    var user2 = new UserModel({name: 'Rachel', email: 'rachel@ps-webforge.net', id: 8});
    var result = { 'users': [user1.serialize, user2.serialize()] };

    driver.dispatch = function(method, url, data, callback) {
      dispatched = true;
      expect(method, 'method').to.be.equal('GET');
      expect(url, 'url').to.be.equal('/api/users');
      expect(data, 'data').to.be.eql(undefined);

      callback(undefined, result);
    };

    backend.cget('ACME.Blog.Entities.User', function(error, returnedResult) {
      expect(error).to.be.not.existing;
      expect(dispatched, 'driver did dispatch the request').to.be.true;
      expect(returnedResult, 'result').to.be.equal(result);
    });

  });
});