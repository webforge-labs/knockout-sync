define(['knockout-mapping', './EntityModel', 'Amplify'], function(koMapping, EntityModel, amplify) {

  /**
   Events:

   knockout-sync.entity-saved
     triggered when an entity with an existing id was saved again
     args: [entity, entityMeta]

   knockout-sync.entity-created 
     triggered when an new entity without an id was saved. the entity has the new id applied
     args: [entity, entityMeta]
 */

  return function Backend(driver, entityModel, prefixUrl) {
    var that = this;

    that.prefixUrl = prefixUrl || '/api/';

    if (!entityModel || !(entityModel instanceof EntityModel)) {
      throw new Error('missing parameter #2 for EntityManager. Provide the entity model');
    }

    if (!driver) {
      throw new Error('missing parameter #1 for EntityManager. Provide the driver');
    }

    this.driver = driver;
    this.model = entityModel;

    this.save = function(entity, callback) {
      var method, url;
      var entityMeta = that.model.getEntityMeta(entity.fqn);

      if (entity.id() > 0) {
        method = 'put';
        url = that.prefixUrl+entityMeta.singular+'/'+entity.id();
      } else {
        method = 'post';
        url = that.prefixUrl+entityMeta.plural;
      }

      that.driver.dispatch(method, url, that.serializeEntity(entity), function(error, result) {
        if (error) throw error;

        var data;
        if (result.id) {
          data = result;
        } else if (result[entityMeta.singular] && result[entityMeta.singular].id) {
          data = result[entityMeta.singular];
        } else {
          throw "driver did returned an valid result set for a saved entity";
        }

        if (!entity.id()) { // set persisted id
          entity.id(result.id);
          amplify.publish('knockout-sync.entity-created', entity, entityMeta);
        } else {
          amplify.publish('knockout-sync.entity-saved', entity, entityMeta);
        }

        if (callback) {
          callback.call(error);
        }
      });
    };

    /**
     * Queries a collection of all entities returned by backend
     */
    this.cget = function(entityFQN, callback) {
      var entityMeta = that.model.getEntityMeta(entityFQN);

      that.driver.dispatch('GET', that.prefixUrl+entityMeta.plural, undefined, function(error, result) {
        callback(undefined, result);
      });
    };

    this.serializeEntity = function(entity) {
      if (typeof(entity.serialize) === 'function') {
        return entity.serialize();
      }

      return koMapping.toJS(entity);
    }
  };
});