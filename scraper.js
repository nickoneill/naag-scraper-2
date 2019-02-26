// This is a template for a Node.js scraper on morph.io (https://morph.io)

var cheerio = require("cheerio");
var request = require("request");
var sqlite3 = require("sqlite3").verbose();
var async = require("async");

function initDatabase(callback) {
	// Set up sqlite database.
	var db = new sqlite3.Database("data.sqlite");
	db.serialize(function() {
		db.run("CREATE TABLE IF NOT EXISTS data (name TEXT, state TEXT, phone TEXT)");
		callback(db);
	});
}

function updateRow(db, name, state, phone) {
	// Insert some data.
	var statement = db.prepare("INSERT INTO data VALUES (?, ?, ?)");
	statement.run(name, state, phone);
	statement.finalize();
}

function readRows(db) {
	// Read some data.
	db.each("SELECT name, state, phone FROM data", function(err, row) {
		console.log(row.state + ", " + row.name + ", "+row.phone);
	});
}

function fetchPage(url, callback) {
	// Use request to read in pages.
	request(url, function (error, response, body) {
		if (error) {
			console.log("Error requesting page: " + error);
			return;
		}

		callback(body);
	});
}

function run(db) {
	// Use request to read in pages.
	fetchPage("https://www.naag.org/naag/attorneys-general/whos-my-ag.php", function (body) {
		// Use cheerio to find things in the page with css selectors.
		var $ = cheerio.load(body);

		var urls = [];
		var elements = $("#cont .row>.inner>.span-2>.inner>a.image-overlay").each(function () {
			var value = $(this).attr('href');
			urls.push("https://www.naag.org/"+value);
			// updateRow(db, value);
		});

		fetchurls(db, urls);
	});
}

function fetchurls(db, urls) {
	async.forEachOf(urls, (url, index, callback) => {
		fetchPage(url, function (body) {
			// Use cheerio to find things in the page with css selectors.
			var urlPage = cheerio.load(body);
			var name = urlPage("#cont h1").text().trim();
			var state = urlPage(".B_crumbBox").children().eq(3).text().trim();
			var phone = urlPage("#cont .row .span-8 .span-8 p").contents().filter(function(){ return this.nodeType == 3 }).eq(1).text().trim();
			// var phone = undefined;
			// console.log("got ",name,state,phone);
			updateRow(db, name, state, phone);
			callback();
		});
	}, function (err) {
		readRows(db);

		db.close();
	});
}

initDatabase(run);
