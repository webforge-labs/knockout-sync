define(['knockout-mapping', './EntityModel', 'Amplify'], function(koMapping, EntityModel, amplify) {

  return function Backend(driver, entityModel) {
    var that = this;

    if (!entityModel || !(entityModel instanceof EntityModel)) {
      throw new Error('missing parameter #2 for EntityManager. Provide the entity model');
    }

    if (!driver) {
      throw new Error('missing parameter #1 for EntityManager. Provide the driver');
    }

    this.driver = driver;
    this.model = entityModel;

    this.save = function(entity) {
      var method, url;
      var entityMeta = that.model.getEntityMeta(entity.fqn);

      if (entity.id() > 0) {
        method = 'put';
        url = '/api/'+entityMeta.singular+'/'+entity.id();
      } else {
        method = 'post';
        url = '/api/'+entityMeta.plural;
      }

      that.driver.dispatch(method, url, that.serializeEntity(entity), function(error, result) {
        if (!error && !entity.id() && result.id) { // get persisted id
          entity.id(result.id);
          amplify.publish('new-entity', entity, entityMeta);
        }
      });
    };

    /**
     * Queries a collection of all entities returned by backend
     */
    this.cget = function(entityFQN, callback) {
      var entityMeta = that.model.getEntityMeta(entityFQN);

      that.driver.dispatch('GET', '/api/'+entityMeta.plural, undefined, function(error, result) {
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