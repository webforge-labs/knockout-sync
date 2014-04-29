define(['./Exception', './EntityModel', 'lodash', 'knockout', 'knockout-mapping'], function(Exception, EntityModel, _, ko, koMapping) {

  /**

   TODO: 

   we need a better conversion from the PHP model to a more useful js model - to not duplicate all model-parsing code
   e.g.

   in the first test we need to find out that "gym" needs first all "clubs" to be hydrated. => we need informations about the associations from gym and clubs
   we need informations about the owning side of associations, etc

   the model needs to be more expanded with names, mappings, etc (model Names). We need to implement that in doctrine

   https://github.com/webforge-labs/webforge-doctrine-compiler/issues/22
 */

  return function(entityModel) {
    var that = this;

    if (!(entityModel instanceof EntityModel)) {
      throw new Exception('missing parameter #1 for EntityManager. Provide the entity model');
    }

    this.model = entityModel;

    this.hydrateListeners = [];
    this.meta = {};
    this.entities = {};

    this.isInit = false;
    this.init = function() {
      if (that.isInit) {
        throw new Error('dont init the em twice!');
      }

      var firstFakeResponse = {};

      // the ko.observableArray([]) has not the mapped* functions (like mappedRemove), when it is not mapped yet, so we do the first mapping by hand with empty collections
      _.each(that.model.getEntities(), function(entityMeta) {
        that.meta[entityMeta.fqn] = entityMeta;
        firstFakeResponse[entityMeta.plural] = [];
      });

      // initialize all collections with a fully empty response
      that.mapResponse(firstFakeResponse);
      that.isInit = true;
    };

    /**
     * Syncs all Entities that are in the response as objects with the entities in memory
     *
     * After that the objects can be retrieved with the find* functions
     * it removes / adds or updates entities in memory
     */
    this.mapResponse = function(response) {
      koMapping.fromJS(response, that.getKnockoutMappingMetadata(), that.entities);
    };

    /**
     * Syncs only the entities in the response with the entities in memory
     *
     * it does not remove entities in memory
     */
    this.mergeResponse = function(response) {
      var mappingMeta = that.getKnockoutMappingMetadata();

      _.each(mappingMeta, function(mapping, collectionKey) {
        if (response[collectionKey] && response[collectionKey].length) {
          var mappedArray = that.entities[collectionKey];
          var entityMapping = that.getEntityMapping(mapping.entityMeta);

          _.each(response[collectionKey], function(unmappedEntity) {
            if (mappedArray.mappedIndexOf(unmappedEntity) !== -1) { // existing entity to update
              var entity = mappedArray.mappedGet(unmappedEntity);

              // we could call update on entity here (if avaible)
              koMapping.fromJS(unmappedEntity, entityMapping, entity);

            } else { // new entity to create
              mappedArray.mappedCreate(unmappedEntity);
            }
          });
        }
      });
    };

    /**
     * Finds a Entity by id
     *
     * a mapped instance will be returned if the identifier is found
     * it will be returned null if the entity is not found
     * [TODO: an exception is thrown if multiple entities are found]
     * @return null|mappedEntity
     */
    this.find = function(entityFQN, identifier) {
      var result = that.findBy(entityFQN, function(entity) {
        return entity.id() === identifier;
      });

      if (result.length === 1) {
        return result.pop();
      }

      return null;
    };

    this.findOrHydrate = function(entityFQN, data) {
      var result = that.findBy(entityFQN, function(entity) {
        return entity.id() === data.id;
      });

      if (result.length === 1) {
        return result.pop();
      }

      return that.hydrate(this.getEntityMeta(entityFQN), data);
    };

    /**
     * Hydrates an entity from data
     * 
     * @return mappedEntity
     */
    this.hydrate = function(entityMeta, data) {
      var entityMapping = that.getEntityMapping(entityMeta);
      var entity = new (entityMeta.modelClass)(data, entityMapping);

      for (var i = 0, listener; i < that.hydrateListeners.length; i++) {
        listener = that.hydrateListeners[i];
        listener.call(listener, entity, entityMeta, data);
      }

      return entity;
    };

    this.create = function(entityFQN, data) {
      var entityMeta = that.getEntityMeta(entityFQN);

      if (!data.id) {
        data.id = undefined;
      }

      return that.hydrate(entityMeta, data);
    };


    /**
     * Finds an Entity by a filter
     * 
     * @param callback filter is a where style callback for lodash: bool function(entity) where entity is the mappedEntity
     * @return array the mappedEntities that matched the filter criteria
     */
    this.findBy = function(entityFQN, filter) {
      var meta = this.getEntityMeta(entityFQN);

      return _.filter(that.entities[meta.plural](), filter);
    };


    this.findOneBy = function(entityFQN, filter) {
      var meta = this.getEntityMeta(entityFQN);
      var result = _.filter(that.entities[meta.plural](), filter);

      if (result.length === 1) {
        return result.pop();
      }

      return null;
    };

    this.findAll = function(entityFQN) {
      var meta = this.getEntityMeta(entityFQN);
      return _.toArray(that.entities[meta.plural]());
    };


    /*
     * returns the observable referencing the current collection of all entities fetched with entityFQN
     * @return ko.observableArray()
     */
    this.refAll = function(entityFQN) {
      var meta = this.getEntityMeta(entityFQN);
      return that.entities[meta.plural];
    };


    this.getKnockoutMappingMetadata = function() {
      var mapping = {};

      /*
      // for every entity, we want to create something like this

      var mapping = {
        'games': {
          key: function(data) {
            return ko.utils.unwrapObservable(data.id);
          },
          create: function(options) {
            return new Game(options.data);
          }
        }
      }
      */

      _.each(that.model.getEntities(), function(entityMeta) {
        mapping[entityMeta.plural] = {
          key: function(data) {
            return ko.utils.unwrapObservable(data.id);
          },

          create: function(options) {
            return that.hydrate(entityMeta, options.data);
          },

          entityMeta: entityMeta
        };

      });

      return mapping;
    };

    this.getEntityMeta = function(entityFQN) {
      if (!that.meta[entityFQN]) {
        throw new Error("There is no EntityMeta stored for FQN: '"+entityFQN+"'");
      }
      return that.meta[entityFQN];
    };

    this.hasEntityMeta = function(entityFQN) {
      return !!that.meta[entityFQN];
    };

    /**
     * Calculates the "inner" mapping passed as second parameter of the constructor to the model
     * 
     * this maps relations from the entity to other entities
     */
    this.getEntityMapping = function(entityMeta) {
      var mapping = {ignore: []};

      _.each(entityMeta.properties, function(property) {
        if (property.type && that.hasEntityMeta(property.type)) {
          var propertyEntityMeta = that.getEntityMeta(property.type);

          mapping[property.name] = {
            create: function(options) {
              if (!options.data) {
                return ko.observable(null);
              }

              var fqn = that.getEntityFQNFromData(propertyEntityMeta, options.data);

              if (options.data.$type) {
                var relatedEntity = that.find(fqn, options.data.$ref);

                if (relatedEntity) {
                  return relatedEntity;
                } else {
                  // load deferred
                  var observable = ko.observable();

                  that.onHydrate(function(hEntity, entityMeta) {
                    if (entityMeta.name === options.data.$type && options.data.$ref === hEntity.id()) {
                      observable(hEntity);
                    }
                  });

                  return observable;
                }

              } else {
                return that.findOrHydrate(fqn, options.data);
              }
            }
          };
        }
      });

      return mapping;
    };

    this.getEntityFQNFromData = function(entityMeta, data) {
      // always trust __class from backend
      if (data.__class) {
        return ko.unwrap(data.__class).replace(/\\/g, '.');
      } else {
        return entityMeta.fqn;
      }
    };

    this.onHydrate = function(listener) {
      that.hydrateListeners.push(listener);
    };

    this.attach = function(entity) {
      var entityMeta = that.getEntityMeta(entity.fqn);
      var mappedArray = that.entities[entityMeta.plural];

      mappedArray.mappedRemove(entity);
      mappedArray.push(entity);
    };

    this.detach = function(entity) {
      var entityMeta = that.getEntityMeta(entity.fqn);
      var mappedArray = that.entities[entityMeta.plural];

      mappedArray.mappedRemove(entity);
    };

    this.init();
  };
});