/*global module:false */
module.exports = function(grunt) {

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  var buildDir = 'lib/js';

  grunt.initConfig({
    sweepout: {
      build: {
        options: {
          configFile: "lib/js/config.js",
          baseUrl: "../../lib/js/",
          dir: buildDir
        }
      }
    },

    requirejs: {
      compile: {
        options: {
          mainConfigFile: buildDir+'/config.js',
          dir: buildDir,

          keepBuildDir: true,
          removeCombined: true, // dont use this when you use a config with paths out of appDir, becuase it would kill files from those urls

          appDir: "src/js",
          baseUrl: "./",

          modules: [
            {
              name: "boot",
              include: [
              ]
            },
          ],
          uglify2: {
            output: {
              beautify: false
            },
            compress: {
              sequences: false
            },
            warnings: true,
            mangle: true
          },
          
          findNestedDependencies: true,
          optimize: "uglify2",
          skipDirOptimize: true,
          optimizeCss: "none"
        }
      }
    },

    jshint: {
      options: {
        curly: false,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        eqnull: true,
        browser: true,
        node: true,
        globals: {
          jQuery: true,
          requirejs: true,
          define: true
        }
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      jsfiles: {
        src: ['src/js/**/*.js']
      }
    },

    simplemocha: {
      options: {
        globals: ['should'],
        timeout: 3000,
        ignoreLeaks: false,
        ui: 'bdd',
        reporter: 'spec'
      },

      all: { src: ['tests/js/**/*.js'] }
    },

    release: {
      options: {
        npmtag: 'canary',
      }
    }
  });

  grunt.registerTask('build-dev', ['sweepout']);
  grunt.registerTask('test', ['simplemocha']);
  grunt.registerTask('default', ['jshint', 'test']);
};
