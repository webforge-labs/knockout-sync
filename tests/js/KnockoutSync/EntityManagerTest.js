var chai = require('chai'),
  expect = chai.expect;
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

var EntityManager = requirejs('KnockoutSync/EntityManager');
var Exception = requirejs('KnockoutSync/Exception');
var EntityModel = requirejs('KnockoutSync/EntityModel');
var UserModel = requirejs('ACME/Blog/Entities/UserModel');
var AuthorModel = requirejs('ACME/Blog/Entities/AuthorModel');

describe('EntityManager', function() {
  var em, model;

  beforeEach(function(done) {
    model = new EntityModel(jsonModel);
    em = new EntityManager(model);
    done();
  });

  it("cannot be created without the entity model", function() {
    expect(function() {
      new EntityManager();

    }).to.throw (Exception, 'Provide the entity model');

  });

  describe('for mapping with metadata', function() {
    var ko = requirejs('knockout'),
      koMapping = requirejs('knockout-mapping');

    it("returns a knockout mapping object for all entities in the model", function() {
      var mapping = em.getKnockoutMappingMetadata();

      expect(mapping).to.be.not.empty;

      expect(mapping).to.have.property('users');
      expect(mapping).to.have.property('posts');
      expect(mapping).to.have.property('categories');
    });

    describe("from an ajax response", function() {
      beforeEach(function() {
        var response = {
          "users": [{
            "id": 1,
            "name": "Alice",
            "email": "alice@ps-webforge.com"
          }, {
            "id": 2,
            "name": "Bob",
            "email": "bob@ps-webforge.com"
          }, {
            "id": 5,
            "name": "Rachel",
            "email": "rachel@ps-webforge.com"
          }]
        };

        em.mapResponse(response);
      });

      it("finds mapped entities by identifier", function() {

        var bob = em.find('ACME.Blog.Entities.User', 1),
          alice = em.find('ACME.Blog.Entities.User', 2),
          rachel = em.find('ACME.Blog.Entities.User', 5);

        expect(bob).to.be.instanceOf(UserModel);
        expect(alice).to.be.instanceOf(UserModel);
        expect(rachel).to.be.instanceOf(UserModel);
      });

      it("finds all mapped entities with findAll", function() {
        var bob = em.find('ACME.Blog.Entities.User', 1),
          alice = em.find('ACME.Blog.Entities.User', 2),
          rachel = em.find('ACME.Blog.Entities.User', 5);

        var all = em.findAll('ACME.Blog.Entities.User');

        expect(all).to.be.deep.equal([bob, alice, rachel]);
      });

      it("finds some entities by filter critieria", function() {
        var alice = em.find('ACME.Blog.Entities.User', 1),
          bob = em.find('ACME.Blog.Entities.User', 2);

        var some = em.findBy('ACME.Blog.Entities.User', function(entity) {
          expect(entity, 'the entity in the findBy callback').to.be.instanceOf(UserModel);

          return entity.name().match(/(Alice|Bob)/);
        });

        expect(some).to.be.deep.equal([alice, bob]);
      });
    });

    describe("from an nested ajax response", function() {

      it("applies nested entities to mapped entities", function() {
        var response = {
          "posts": [{
            "id": 1,
            "title": "Working with associations",

            "author": {
              "$type": "Author",
              "$ref": 1
            }
          }, {
            "id": 3,
            "title": "Working with objects",

            "author": {
              "$type": "Author",
              "$ref": 1
            }
          }, {
            "id": 5,
            "title": "Marketing speach - part 1",

            "author": {
              "$type": "Author",
              "$ref": 2
            }
          }],

          "authors": [{
            "id": 1,
            "name": "Alice",
            "email": "alice@ps-webforge.com"
          }, {
            "id": 2,
            "name": "Bob",
            "email": "bob@ps-webforge.com"
          }, {
            "id": 5,
            "name": "Rachel",
            "email": "rachel@ps-webforge.com"
          }]
        };

        em.mapResponse(response);

        var post1 = em.find('ACME.Blog.Entities.Post', 1);
        var alice = em.find('ACME.Blog.Entities.Author', 1);

        expect(post1).to.have.property('author');
        expect(post1.author(), 'author from post1').to.be.instanceOf(AuthorModel);
      });
    });
  });
});