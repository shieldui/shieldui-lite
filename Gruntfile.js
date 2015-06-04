// Shield UI Lite Gruntfile
module.exports = function(grunt) {

grunt.initConfig({
	pkg: (function() {
        var config = grunt.file.readJSON('package.json');
        config.version = grunt.file.read('VERSION').replace(/\s+/g, '');
        return config;
    })(),

    bower: {
        install: {
            options: {
                layout: 'byComponent',
                copy: false
            }
        }
    },

    copy: {
        bower: {
            files: [
                { src: ['bower_components/jquery/dist/jquery.min.js'], dest: 'external/jquery/jquery.min.js' },
                { expand: true, cwd: 'bower_components/globalize/lib', src: ['**'], dest: 'external/globalize' },
                { expand: true, cwd: 'bower_components/qunit/qunit', src: ['**'], dest: 'external/qunit' },
                { expand: true, cwd: 'bower_components/sinon/lib', src: ['**'], dest: 'external/sinon' }
            ]
        },
        main: {
            files: [
                { expand: true, src: ['common/*.js'], dest: 'dist/js/', flatten: true },
                { expand: true, src: ['*/js/*.js'], dest: 'dist/js/', flatten: true },
                { expand: true, src: ['*/css/img/*.*'], dest: 'dist/css/img/', flatten: true },
                { expand: true, src: ['*/css/less/**'], dest: 'dist/css/less/' },
                { expand: true, src: ['common/less/**/*.less'], dest: 'dist/css/less/' },
            ]
        }
    },

    jshint: {
        options: {
            jshintrc: '.jshintrc'
        },
        files: ['*/**/*.js', '!bower_components/**', '!node_modules/**', '!external/**', '!**/tests/**']
    },

    qunit: {
		common: ['common/tests/*.html']
    },

    less: (function() {
        var result = {},
            themes = grunt.file.expand({cwd: 'common/less/themes'}, '*.less'),
            i,
            theme;

        for (i=0; i<themes.length; i++) {
            theme = themes[i].replace(/\.less$/i, "");

            result[theme] = {
                options: {
                    modifyVars: {
                        theme: theme
                    }
                },
                expand: true,
                cwd: 'dist/css/less/',
                src: '*/css/less/*.less',
                dest: 'dist/css/' + theme + '/',
                ext: '.css',
                flatten: true
            };
        }

        return result;
    })(),

    uglify: {
        options: {
			mangle: {
				sort: true,
				toplevel: true
			},
			compress: true,
			preserveComments: false
		},
        core: {
            files: {
                'dist/js/<%= pkg.name %>-core.min.js': [
                    'dist/js/core.js',
                    'dist/js/data.js',
                    'dist/js/util.js'
                ]
            }
        },
        widgets: {
            files: [{
                expand: true,
                cwd: 'dist/js',
                src: ['*.js', '!*.min.js'],
                rename: function(dest, src) {
                    return "dist/js/<%= pkg.name %>-" + src.replace(/^.*?([^\\\/]+)$/, "$1").replace(/\..*$/, "") + ".min.js";
                }
            }]
        }
    },

    replace: {
        // qrcode - put the special dictionary keys in quotes
		qrcode_unicode_chars: {
			src: ['dist/js/<%= pkg.name %>-qrcode.min.js'],
			overwrite: true,
			replacements: [
				{ 
					from: /([\¯\｡\｢\｣\､\･\ｦ\ｧ\ｨ\ｩ\ｪ\ｫ\ｬ\ｭ\ｮ\ｯ\ｰ\ｱ\ｲ\ｳ\ｴ\ｵ\ｶ\ｷ\ｸ\ｹ\ｺ\ｻ\ｼ\ｽ\ｾ\ｿ\ﾀ\ﾁ\ﾂ\ﾃ\ﾄ\ﾅ\ﾆ\ﾇ\ﾈ\ﾉ\ﾊ\ﾋ\ﾌ\ﾍ\ﾎ\ﾏ\ﾐ\ﾑ\ﾒ\ﾓ\ﾔ\ﾕ\ﾖ\ﾗ\ﾘ\ﾙ\ﾚ\ﾛ\ﾜ\ﾝ\ﾞ\ﾟ])\:/g,
					to: "\"$1\":" 
				}
			]
		}
	},

    usebanner: {
        version: {
			options: {
				position: 'bottom',
				banner: "shield.version='<%= pkg.version %>';"
			},
			files: {
				src: [
					'dist/js/<%= pkg.name %>-core.min.js'
				]
			}
		},
        main: {
			options: {
				position: 'top',
				banner: "/* Shield UI Lite <%= pkg.version %> | Copyright 2013-" + (new Date()).getFullYear() + " Shield UI Ltd. | <%= pkg.homepage %> */"
			},
			files: {
				src: [
					'dist/js/*.min.js',
					'dist/css/**/*.min.css'
				]
			}
		}
    },

    cssmin: {
        all: {
            expand: true,
			src: ['dist/css/**/*.css', '!dist/css/**/*.min.css'],
			ext: '.min.css'
        }
	},

    concat: {
        options: {
            stripBanners: true
        },
        js: {
            dest: 'dist/js/<%= pkg.name %>-all.min.js',
            src: [
                'dist/js/<%= pkg.name %>-core.min.js',
                'dist/js/<%= pkg.name %>-qrcode.min.js',
                'dist/js/<%= pkg.name %>-loadingpanel.min.js',
                'dist/js/<%= pkg.name %>-pager.min.js',
                'dist/js/<%= pkg.name %>-input.min.js',
                'dist/js/<%= pkg.name %>-calendar.min.js',
                'dist/js/<%= pkg.name %>-grid.min.js'
            ]
        },
        themes: {
			expand: true,
			src: ['dist/css/*/*.min.css', '!dist/css/img/**', '!dist/css/*/rtl.min.css', 'dist/css/*/rtl.min.css'],
			rename: function(dest, src) {
				return src.replace(/\/[^\/]+$/, "/all.min.css");
			}
		}
    },

    clean: {
        dist: ['dist'],
        less: ['dist/css/less'],
        uglify_core: ['dist/js/core.js', 'dist/js/data.js', 'dist/js/util.js'],
        uglify_widgets: ['dist/js/*.js', '!dist/js/*.min.js'],
        cssmin: ['dist/css/**/*.css', '!dist/css/**/*.min.css'],
        external: ['external']
    }
});


grunt.loadNpmTasks('grunt-contrib-qunit');
grunt.loadNpmTasks('grunt-contrib-copy');
grunt.loadNpmTasks('grunt-contrib-clean');
grunt.loadNpmTasks('grunt-contrib-jshint');
grunt.loadNpmTasks('grunt-contrib-less');
grunt.loadNpmTasks('grunt-contrib-uglify');
grunt.loadNpmTasks('grunt-contrib-cssmin');
grunt.loadNpmTasks('grunt-contrib-concat');
grunt.loadNpmTasks('grunt-text-replace');
grunt.loadNpmTasks('grunt-bower-task');
grunt.loadNpmTasks('grunt-banner');

grunt.registerTask('clean:all', ['clean:external', 'clean:dist']);

grunt.registerTask('build', [
    'clean:all',
    'bower',
    'copy:bower',
    'jshint', 'qunit',
    'copy:main',
    'less', 'clean:less',
    'uglify:core', 'clean:uglify_core',
    'uglify:widgets', 'clean:uglify_widgets',
    'replace',
    'usebanner:version',
    'cssmin', 'clean:cssmin',
    'concat',
    'usebanner:main'
]);

grunt.registerTask('default', ['build']);

};
