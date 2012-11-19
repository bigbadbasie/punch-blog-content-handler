var _ = require("underscore");
var blog_content_handler = require('../lib/blog_content_handler.js');
var module_utils = require("punch").Utils.Module;
var default_content_handler = require("punch").ContentHandler;

describe("setup", function() {

	var sample_config = {
		blog: {
			posts_dir: "posts_dir",
		},

		plugins: {
			parsers: {
				".markdown": "sample_markdown_parser",
				".yml": "sample_yml_parser"
			}
		}
	};

	beforeEach(function() {
		blog_content_handler.parsers = {};
		blog_content_handler.postsDir = "posts";

		spyOn(module_utils, "requireAndSetup").andCallFake(function(id, config){
			return {"id": id};
		});
	});

	it("setup each parser", function(){
		blog_content_handler.setup(sample_config);
		expect(blog_content_handler.parsers).toEqual({ ".markdown": { "id": "sample_markdown_parser" }, ".yml": { "id": "sample_yml_parser" } });
	});

	it("delegate setup to default content handler", function() {
		spyOn(default_content_handler, "setup");

		blog_content_handler.setup(sample_config);
		expect(default_content_handler.setup).toHaveBeenCalledWith(sample_config);
	});

	it("keep the defaults if no blog specific configs are provided", function() {
		blog_content_handler.setup({ "plugins": {} });
		expect(blog_content_handler.postsDir).toEqual("posts");
	});

	it("configure posts directory", function() {
		blog_content_handler.setup(sample_config);
		expect(blog_content_handler.postsDir).toEqual("posts_dir");
	});

	it("delegate to setup URL patterns", function() {
		spyOn(blog_content_handler, "setupUrlPatterns");

		blog_content_handler.setup(sample_config);
		expect(blog_content_handler.setupUrlPatterns).toHaveBeenCalledWith(sample_config);
	});

});

describe("setup URL patterns", function() {
	var sample_config = {
		blog: {
			post_url: "/{year}/{month}/{date}-{title}",
			archive_urls: {
				"all": "/history"
			}
		}
	}

	it("set the post url pattern based on the given post url", function() {
		blog_content_handler.setupUrlPatterns(sample_config);
		expect(blog_content_handler.postUrl).toEqual({ "pattern": "\\/(\\d\\d\\d\\d)\\/(\\d\\d)\\/(\\d\\d)-([^\\/\\s]+)", "mappings": { 'year': 1, 'month': 2, 'date': 3, 'title': 4 }});
	});

	it("set the archive url patterns as an array", function() {
		blog_content_handler.setupUrlPatterns(sample_config);
		expect(blog_content_handler.archiveUrls).toEqual([ { "pattern": "\\/history", "mappings": {} },
		 																													{ "pattern": "\\/(\\d\\d\\d\\d)", "mappings": { 'year': 1 } },
																														 	{ "pattern": "\\/(\\d\\d\\d\\d)\\/(\\d\\d)", "mappings": { 'year': 1, 'month': 2 } },
																														  { "pattern": "\\/(\\d\\d\\d\\d)\\/(\\d\\d)\\/(\\d\\d)", "mappings": { 'year': 1, 'month': 2, 'date': 3 } },
																															{	"pattern": "\\/tag\\/([^\\/\\s]+)", "mappings": { 'tag': 1 } } ]);
	});
});

describe("is section", function() {

	beforeEach(function() {
		var sample_config = {
			blog: {
				post_url: "/{year}/{month}/{date}-{title}"
			}
		}

		blog_content_handler.setupUrlPatterns(sample_config);
	});

	it("treat post urls as sections", function() {
		expect(blog_content_handler.isSection("/2012/11/19-test-post")).toEqual(true);
	});

	it("treat /archive as a section", function() {
		expect(blog_content_handler.isSection("/archive")).toEqual(true);
	});

	it("treat tag urls as a section", function() {
		expect(blog_content_handler.isSection("/tag/life")).toEqual(true);
	});

	it("treat year-months archives as a section", function() {
		expect(blog_content_handler.isSection("/2012/10")).toEqual(true);
	});

	it("delegate other urls to default content handler", function() {
		spyOn(default_content_handler, "isSection");

		blog_content_handler.isSection("/section/sub");
		expect(default_content_handler.isSection).toHaveBeenCalledWith("/section/sub");
	});

});

describe("get sections", function() {

	it("delegate to the default content handler", function() {
		spyOn(default_content_handler, "getSections");

		var spyCallback = jasmine.createSpy();
		blog_content_handler.getSections(spyCallback);

		expect(default_content_handler.getSections).toHaveBeenCalledWith(spyCallback);
	});

});

describe("negotiate content", function() {

	beforeEach(function() {
		var sample_config = {
			blog: {
				post_url: "/{year}/{month}/{date}-{title}"
			}
		}

		blog_content_handler.setupUrlPatterns(sample_config);
	});

	it("delegate to get post if a post url given", function() {
		spyOn(blog_content_handler, "getPost");

		var spyCallback = jasmine.createSpy();
		blog_content_handler.negotiateContent("/2012/11/20-test-post/index", ".html", {}, spyCallback);

		expect(blog_content_handler.getPost).toHaveBeenCalledWith("/2012/11/20-test-post/index", jasmine.any(Function));
	});

	it("add shared content to the post", function() {
		spyOn(blog_content_handler, "getPost").andCallFake(function(basepath, callback) {
			return callback(null, {}, new Date(2012, 10, 20));
		});

		spyOn(default_content_handler, "getSharedContent");

		var spyCallback = jasmine.createSpy();
		blog_content_handler.negotiateContent("/2012/11/20-test-post/index", ".html", {}, spyCallback);

		expect(default_content_handler.getSharedContent).toHaveBeenCalledWith(jasmine.any(Function));
	});

	it("set the post specific attributes", function() {
		spyOn(blog_content_handler, "getPost").andCallFake(function(basepath, callback) {
			return callback(null, {}, new Date(2012, 10, 20));
		});

		spyOn(default_content_handler, "getSharedContent").andCallFake(function(callback) {
			return callback(null, {}, new Date(2012, 10, 20));
		});

		var spyCallback = jasmine.createSpy();
		blog_content_handler.negotiateContent("/2012/11/20-test-post/index", ".html", {}, spyCallback);

		expect(spyCallback).toHaveBeenCalledWith(null, { "is_post" : true }, {}, jasmine.any(Date));
	});

	it("delegate to get posts if archive url is given", function() {
		spyOn(blog_content_handler, "getPosts");

		var spyCallback = jasmine.createSpy();
		blog_content_handler.negotiateContent("/2012/11/index", ".html", {}, spyCallback);

		expect(blog_content_handler.getPosts).toHaveBeenCalledWith("/2012/11/index", jasmine.any(Function));
	});

	it("add shared content to an archive list", function() {
		spyOn(blog_content_handler, "getPosts").andCallFake(function(basepath, callback) {
			return callback(null, {}, new Date(2012, 10, 20));
		});

		spyOn(default_content_handler, "getSharedContent");

		var spyCallback = jasmine.createSpy();
		blog_content_handler.negotiateContent("/2012/11/index", ".html", {}, spyCallback);

		expect(default_content_handler.getSharedContent).toHaveBeenCalledWith(jasmine.any(Function));
	});

	it("set the archive specific attributes", function() {
		spyOn(blog_content_handler, "getPosts").andCallFake(function(basepath, callback) {
			return callback(null, {}, new Date(2012, 10, 20));
		});

		spyOn(default_content_handler, "getSharedContent").andCallFake(function(callback) {
			return callback(null, {}, new Date(2012, 10, 20));
		});

		var spyCallback = jasmine.createSpy();
		blog_content_handler.negotiateContent("/2012/11/index", ".html", {}, spyCallback);

		expect(spyCallback).toHaveBeenCalledWith(null, { "is_post" : false, "title": "Archive" }, {}, jasmine.any(Date));
	});

	it("delegate content requests for other pages to default handler", function() {
		spyOn(default_content_handler, "negotiateContent");

		var spyCallback = jasmine.createSpy();
		blog_content_handler.negotiateContent("/about/index", ".html", {}, spyCallback);

		expect(default_content_handler.negotiateContent).toHaveBeenCalledWith("/about/index", ".html", {}, spyCallback);
	});

});

describe("get content paths", function() {

});

describe("get a post", function() {

	beforeEach(function() {
		var sample_config = {
			blog: {
				post_url: "/{year}/{month}/{date}-{title}",
				post_format: "md",
				posts_dir: "articles"
			},
			plugins: {}
		}

		blog_content_handler.setup(sample_config);
	});

	it("call parse content with the correct file path", function() {
		spyOn(blog_content_handler, "parseContent");

		var spyCallback = jasmine.createSpy();
		blog_content_handler.getPost("/2012/11/20-test-post", spyCallback);

		expect(blog_content_handler.parseContent).toHaveBeenCalledWith("articles/2012-11-20-test-post.md", true, jasmine.any(Function));
	});

	it("call the callback with the output from parse content", function() {
		spyOn(blog_content_handler, "parseContent").andCallFake(function(path, parse_post, callback) {
			return callback(null, { "last_modified": new Date(2012, 10, 20), "title": "test post" });
		});

		var spyCallback = jasmine.createSpy();
		blog_content_handler.getPost("/2012/11/20-test-post", spyCallback);

		expect(spyCallback).toHaveBeenCalledWith(null, { "last_modified": new Date(2012, 10, 20), "title": "test post" }, new Date(2012, 10, 20))
	});

	it("call the callback with an error if the given path is invalid", function() {
		var spyCallback = jasmine.createSpy();
		blog_content_handler.getPost("/2012/11/20/test-post", spyCallback);

		expect(spyCallback).toHaveBeenCalledWith("[Error: Content for /2012/11/20/test-post not found]", null);
	});
});

describe("get posts", function() {

	var dummy_posts_obj = {
		"post_1": { "tags": [ "test" ], "published_date": new Date(2011, 8, 1), "published": true },
		"post_2": { "tags": [ "test", "test2" ], "published_date": new Date(2012, 1, 1), "published": true },
		"post_3": { "tags": [ "test", "test2" ], "published_date": new Date(2012, 1, 3), "published": true },
		"post_4": { "tags": [ "test", "test3" ], "published_date": new Date(2012, 1, 3), "published": true },
		"post_5": { "tags": [ "test", "test3" ], "published_date": new Date(2012, 1, 3), "published": false }
	}

	beforeEach(function() {
		spyOn(blog_content_handler, "getAllPosts").andCallFake(function(callback) {
			return callback(null, dummy_posts_obj, new Date(2012, 10, 20));
		});
	});

	it("return all posts for /archive", function() {
		var spyCallback = jasmine.createSpy();
		blog_content_handler.getPosts("/archive/index", spyCallback);
		expect(spyCallback).toHaveBeenCalledWith(null, { "posts": [ dummy_posts_obj["post_4"], dummy_posts_obj["post_3"], dummy_posts_obj["post_2"], dummy_posts_obj["post_1"] ] }, new Date(2012, 10, 20));
	});

	it("return posts tagged test2", function() {
		var spyCallback = jasmine.createSpy();
		blog_content_handler.getPosts("/tag/test2/index", spyCallback);
		expect(spyCallback).toHaveBeenCalledWith(null, { "posts": [ dummy_posts_obj["post_3"], dummy_posts_obj["post_2"] ] }, new Date(2012, 10, 20));
	});

	it("return posts published in 2011", function() {
		var spyCallback = jasmine.createSpy();
		blog_content_handler.getPosts("/2011/index", spyCallback);
		expect(spyCallback).toHaveBeenCalledWith(null, { "posts": [ dummy_posts_obj["post_1"] ] }, new Date(2012, 10, 20));
	});

	it("return posts published in February 2012", function() {
		var spyCallback = jasmine.createSpy();
		blog_content_handler.getPosts("/2012/02/index", spyCallback);
		expect(spyCallback).toHaveBeenCalledWith(null, { "posts": [ dummy_posts_obj["post_4"], dummy_posts_obj["post_3"], dummy_posts_obj["post_2"] ] }, new Date(2012, 10, 20));
	});

	it("return posts published on 3rd February 2012", function() {
		var spyCallback = jasmine.createSpy();
		blog_content_handler.getPosts("/2012/02/03/index", spyCallback);
		expect(spyCallback).toHaveBeenCalledWith(null, { "posts": [ dummy_posts_obj["post_4"], dummy_posts_obj["post_3"] ] }, new Date(2012, 10, 20));
	});

});

describe("parse content", function() {

});
