/* jshint expr:true */
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
var PostModel = requirejs('ACME/Blog/Entities/PostModel');
var TagModel = requirejs('ACME/Blog/Entities/TagModel');
var ko = requirejs('knockout');

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

      it("applies nested empty entities without error to empty observables (todo: define mapping to what)", function() {
        var response = {
          "posts": [{
            "id": 1,
            "title": "Working with associations",

            "author": null
          }]
        };

        em.mapResponse(response);

        var post1 = em.find('ACME.Blog.Entities.Post', 1);

        expect(post1).to.have.property('author');
        // to define: empty observable or just null or undefined?
        expect(post1.author(), 'author from post1').to.be.not.existing;
      });

      it("returns null for getting a single mapped result to a single entity", function() {
        var response = {
          "posts": []
        };

        var result = em.getSingleMappedResponse('ACME.Blog.Entities.Post', response);

        expect(result).to.be.null;
      });

      var postWithTagsResponse = {
        "posts": [{
          "id": 1,
          "title": "Working with associations",

          "author": {
            "id": 2,
            "name": "Alice",
            "email": "alice@ps-webforge.com"
          },

          "tags": [
            {
              label: "doctrine"
            },
            {
              label: "ORM"
            }
          ]
        }]
      };

      it("can get a mapped result to a single entity without attaching it", function() {
        var posts = em.getMappedResponse('ACME.Blog.Entities.Post', postWithTagsResponse);
        expect(ko.unwrap(posts)).to.have.length(1);

        var expectPost = function(post) {
          expect(post).to.have.property('id');
          expect(post.id()).to.be.equal(1);

          expect(post).to.have.property('author');
          expect(post.author).to.be.an.instanceOf(AuthorModel);
          expect(post.author.id()).to.be.equal(2);

          expect(post).to.have.property('tags');

          expect(ko.isObservable(post.tags) && post.tags.indexOf !== undefined, 'post.tags should be an observable array').to.be.ok;
          expect(post.tags()).to.have.length(2);

          expect(em.find('ACME.Blog.Entities.Post', 1), 'entity should not be attached from getMappedResponse').to.be.not.ok;
        };

        expectPost(posts()[0]);

        var post = em.getSingleMappedResponse('ACME.Blog.Entities.Post', postWithTagsResponse);
        expectPost(post);
      });

      it("maps entity collections of an entity to a collection of entities", function() {
        var posts = em.getMappedResponse('ACME.Blog.Entities.Post', postWithTagsResponse);
        expect(ko.unwrap(posts)).to.have.length(1);

        var post = posts()[0];

        expect(post).to.have.property('tags');
        expect(ko.isObservable(post.tags) && post.tags.indexOf !== undefined, 'post.tags should be an observable array').to.be.ok;

        var tag = post.tags()[0];

        expect(tag, 'tag should be an entity of ACME.Blog.Entities.Tag').to.be.instanceOf(TagModel);
      });

      it.skip("do map carefully too nested responses", function() {
        var response = {
          "posts": [{
            "id": 1,
            "title": "Working with associations",

            "author": {
              "id": 2,
              "name": "Alice",
              "email": "alice@ps-webforge.com",

              "posts": [{
                "id": 1,
                "title": "Working with associations",

                "author": null,

                "tags": [
                  {
                    label: "doctrine"
                  },
                  {
                    label: "ORM"
                  }
                ]
              }]
            },

            "tags": [
              {
                label: "doctrine"
              },
              {
                label: "ORM"
              }
            ]
          }]
        };

        var posts = em.getMappedResponse('ACME.Blog.Entities.Post', response);
        expect(ko.unwrap(posts)).to.have.length(1);

        var post = posts()[0];

        expect(post).to.have.property('author');
        expect(post.author).to.be.an.instanceOf(AuthorModel);

        expect(post.author).to.have.property('posts');

        var nestedPosts = post.author.posts;
        expect(ko.isObservable(nestedPosts) && nestedPosts.indexOf !== undefined, 'post[0].author.posts should be an observable array').to.be.ok;

        var nestedPost = nestedPosts()[0];

        expect(nestedPost).to.be.an.instanceOf(PostModel);
      });


      it("throws an error in getSingleMappedResponse when more than one root entity is defined", function() {
        var response = {
          "posts": [{
            "id": 1,
            "title": "Working with associations"
          }, {
            "id": 3,
            "title": "Working with objects",
          }]
        };

        var getMapped = function() {
          em.getSingleMappedResponse('ACME.Blog.Entities.Post', response);
        };

        expect(getMapped).to.throw('expected response to have only one entity');

      });
    });
  });

  it("can refresh an entity already fetchecd", function () {
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

    // this puts 3 items into the entityManager
    em.mapResponse(response);

    // we want to refresh bob
    var additionalResponse = {
      "users": [
        {
          "id": 2,
          "name": "Bob B.",
          "email": "bob@ps-webforge.com"
        }
      ]
    };

    em.mergeResponse(additionalResponse);

    var bob = em.find('ACME.Blog.Entities.User', 2);
    expect(bob).to.exist;
    expect(bob.name(),'name from bob should have changed').to.be.eql('Bob B.');

    expect(em.find('ACME.Blog.Entities.User', 1), 'other users should not be detached').to.exist;
    expect(em.find('ACME.Blog.Entities.User', 5), 'other uses should nto be detached').to.exist;
  });

  it("can attach an object by key", function() {
    var ross = new UserModel({name: 'Ross', email: 'ross@ps-webforge.net', id: 7});

    expect(em.find('ACME.Blog.Entities.User', 7)).to.not.exist;

    em.attach(ross);

    expect(em.find('ACME.Blog.Entities.User', 7), 'find user 7').to.be.eql(ross);
  });

  it("does not attach the same object twice", function() {
    var ross = new UserModel({name: 'Ross', email: 'ross@ps-webforge.net', id: 7});

    expect(em.findAll('ACME.Blog.Entities.User')).to.have.length(0);
    em.attach(ross);
    em.attach(ross);

    expect(em.findAll('ACME.Blog.Entities.User'), 'all users').to.have.length(1);
  });

  it("can detach an object by key", function() {
    var ross = new UserModel({name: 'Ross', email: 'ross@ps-webforge.net', id: 7});
    em.attach(ross);
    expect(em.find('ACME.Blog.Entities.User', 7), 'find user 7').to.be.eql(ross);

    em.detach(ross);
    expect(em.find('ACME.Blog.Entities.User', 7), 'should not find user 7').to.be.null;
  });

  describe("helps creating new,empty models", function () {
    before(function () {
      this.ross = new AuthorModel({name: 'Ross', email: 'ross@ps-webforge.net', id: 7});
      this.rossUser = new UserModel({name: 'Ross', email: 'ross@ps-webforge.net', id: 7});
    });

    it("creates the id automatically (to be defined: will it throw errors here, because we left some properties?)", function () {
      var ross = em.create('ACME.Blog.Entities.User', {
        name: 'Ross'
      });

      expect(ross).to.have.property('id');
      expect(ross).to.have.property('name');
      expect(ross.name()).to.equal('Ross');
    });

    it("does not map already mapped entities twice in data", function () {
      var post = em.create('ACME.Blog.Entities.Post', {
        author: this.ross,
        "tags": [
          {
            label: "doctrine"
          },
          {
            label: "ORM"
          }
        ]
      });

      expect(ko.isObservable(post.author.__ko_mapping__.ignore), 'should not be an double mapped observable').to.be.false;
    });

    it("finds wrongly passed entities in data", function () {
      var rossUser = this.rossUser;

      var create = function () {
        var post = em.create('ACME.Blog.Entities.Post', {
          author: rossUser,
        });
      };

      expect(create).to.throw('observables passed as data for constructor of an entity');
    });

  });
});