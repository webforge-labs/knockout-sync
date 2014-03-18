/* jshint expr: true */
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
  })
);

var Backend = requirejs('KnockoutSync/Backend');
var UserModel = requirejs('ACME/Blog/Entities/UserModel');
var EntityModel = requirejs('KnockoutSync/EntityModel');
var AjaxDriver = function() {};
var amplify = requirejs('Amplify');

describe('Yield Deploy Backend', function() {
  var backend, driver, model, expectations;

  beforeEach(function() {
    model = new EntityModel(jsonModel);
    backend = new Backend(driver = new AjaxDriver(), model);
    expectations = [];
  });

  afterEach(function() {
    _.each(expectations, function(expectation) {
      expectation();
    });
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

  var Dispatch = function(properties) {
    var that = this;

    this.dispatched = false;

    _.extend(that, properties);

    if (that.response) {
      this.toDo = function(method, url, data, callback) {
        callback(undefined, that.response);
      };
    }

    if (that.error) {
      this.toDo = function(method, url, data, callback) {
        callback(that.error);
      };
    }

    driver.dispatch = function(method, url, data, callback) {
      that.dispatched = true;
      expect(method, 'method').to.be.equal(that.method);
      expect(url, 'url').to.be.equal(that.url);
      expect(data, 'data').to.be.eql(that.data);

      return that.toDo.call(this, method, url, data, callback);
    };

    this.wasDispatched = function() {
      return that.dispatched;
    };
  };

  var expectDispatch = function(dispatch) {
    if (!(dispatch instanceof Dispatch)) {
      dispatch = new Dispatch(dispatch);
    }

    expectations.push(function() {
      expect(dispatch.wasDispatched(), 'driver was dispatched').to.be.true;
    });

    return dispatch;
  };

  var expectAmplify = function(topic, withCallback) {
    var called = false, subscriber;

    amplify.subscribe(topic, subscriber = function() {
      called = true;
      if (withCallback) {
        withCallback.apply(this, arguments);
      }
    });

    expectations.push(function() {
      amplify.unsubscribe(topic, subscriber); // cleanup, because otherwise expectations from other tests will trigger on the next test
      expect(called, 'amplify topic: '+topic+' should have been called').to.be.true;
    });
  };

  var expectThat = function(what) {
    expectations.push(what);
  };

  var response = function (data, code) {
    return {
      body: data,
      code: code,
      headers: {} // not needed right now
      //rawBody: JSON.stringify(data)
    };
  };

  describe('Persistence', function() {

    it("saves a new entity", function(done) {
      var user = new UserModel({
        name: 'Ross',
        email: 'ross@ps-webforge.com',
        id: undefined
      });

      expectDispatch({
        method: 'post',
        url: '/api/users',
        data: user.serialize(),
        toDo: function(method, url, data, callback) {
          data.id = 7;

          callback(undefined, response(data, 201));
        }
      });

      expectAmplify(
        'knockout-sync.entity-created',
        function(eventEntity, eventEntityMeta) {
          expect(eventEntity).to.be.equal(user);
          expect(eventEntity.id(), 'event user.id').to.be.equal(7);
          expect(eventEntityMeta.fqn).to.be.eql(user.fqn);
        }
        );

      backend.save(user, function(error) {
        expect(error).to.not.exist;
        expect(user.id(), 'user.id').to.be.equal(7);
        done();
      });
    });

    it("saves an existing entity", function(done) {
      var user = new UserModel({
        name: 'Ross',
        email: 'ross@ps-webforge.net',
        id: 7
      });

      expectDispatch({
        method: 'put',
        url: '/api/user/7',
        data: user.serialize(),
        response: response(user.serialize(), 200)
      });

      expectAmplify(
        'knockout-sync.entity-saved',
        function(eventEntity, eventEntityMeta) {
          expect(eventEntity).to.be.eql(user);
          expect(eventEntityMeta.fqn).to.be.eql(user.fqn);
        }
      );

      backend.save(user, function(error) {
        expect(error).to.not.exist;
        expect(user.id(), 'user.id').to.be.equal(7);
        done();
      });
    });

    it("populates the error while saving an entity", function(done) {
      var user = new UserModel({
        name: 'Ross',
        email: 'ross@ps-webforge.net',
        id: 7
      });

      expectDispatch({
        method: 'put',
        url: '/api/user/7',
        data: user.serialize(),
        response: response(user.serialize(), 200)
      });

      expectAmplify(
        'knockout-sync.entity-saved',
        function(eventEntity, eventEntityMeta) {
          expect(eventEntity).to.be.eql(user);
          expect(eventEntityMeta.fqn).to.be.eql(user.fqn);
        }
      );

      backend.save(user, function(error) {
        expect(error).to.not.exist;
        expect(user.id(), 'user.id').to.be.equal(7);
        done();
      });
    });
  });

  it("queries a collection of entities", function() {
    var user1 = new UserModel({
      name: 'Ross',
      email: 'ross@ps-webforge.net',
      id: 7
    });
    var user2 = new UserModel({
      name: 'Rachel',
      email: 'rachel@ps-webforge.net',
      id: 8
    });

    var result, serverResponse = response(result = {
      'users': [user1.serialize, user2.serialize()]
    }, 200);

    expectDispatch({
      method: 'GET',
      url: '/api/users',
      data: undefined,
      response: serverResponse
    });

    backend.cget('ACME.Blog.Entities.User', function(error, returnedResult) {
      expect(error).to.be.not.existing;
      expect(returnedResult, 'result').to.be.equal(result);
    });

  });

  var expectDriverToReturnSingleUser = function() {
    var user = new UserModel({
      name: 'Rachel',
      email: 'rachel@ps-webforge.net',
      id: 8
    });

    var result = {
      'user': user.serialize()
    };

    expectDispatch({
      method: 'GET',
      url: '/api/users/8',
      data: undefined,
      response: response(result, 200)
    });

    return {
      // user is transformed to users here
      'users': [user.serialize()]
    };
  };

  it("queries one specific entity by single scalar", function(done) {
    var normalizedResult = expectDriverToReturnSingleUser();

    backend.get('ACME.Blog.Entities.User', 8, function(error, returnedResult) {
      expect(error).to.be.not.existing;
      expect(returnedResult).to.be.eql(normalizedResult);
      done();
    });

  });

  it("queries one specific entity by identifiers object", function(done) {
    var normalizedResult = expectDriverToReturnSingleUser();

    backend.get('ACME.Blog.Entities.User', {id: 8}, function(error, returnedResult) {
      expect(error).to.be.not.existing;
      expect(returnedResult).to.be.eql(normalizedResult);
      done();
    });

  });
});