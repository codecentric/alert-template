require("dotenv").config(); // eslint: don't assign

var gulp  = require("gulp"),
    zip = require("gulp-zip"),
    runSequence = require("run-sequence"),
    del = require("del"),
    exec = require("child_process").exec,
    eslint = require("gulp-eslint");

var pkg = require("./package.json");

gulp.task("default", ["build", "watch"]);

gulp.task("build", function(callback) {
    runSequence(
        "clean",
        "lint",
        "test",
        "validate",
        "dist",
        "cfn-dist",
        "sync",
        callback);
});

gulp.task("sync", function(callback) {
    exec("aws s3 sync dist/ s3://" + process.env.s3Bucket, function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        callback(err);
    });
});

gulp.task("cfn-dist", function() {
    return gulp.src(["cfn/*.yml", "cfn/*.json"], { base: "cfn" })
        .pipe(gulp.dest("./dist"));
});

gulp.task("dist", function() {
    return gulp.src(["index.js", "package.json", "package-lock.json"], { base: "." })
        .pipe(zip(pkg.name + "-" + pkg.version + ".zip"))
        .pipe(gulp.dest("./dist"));
});

gulp.task("lint", function() {
    return gulp.src(["*.js", "test/*.js"])
        .pipe(eslint())
        .pipe(eslint.formatEach());
});

gulp.task("test", function(callback) {
    exec("npm test", function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        callback(err);
    });
});

gulp.task("validate", function(callback) {
    exec("aws cloudformation validate-template --template-body file://cfn/alert-template.yml && aws cloudformation validate-template --template-body file://cfn/host-template.yml", function(err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
        callback(err);
    });
});

gulp.task("clean", function() {
    return del.sync(["./dist/*"], { force: true });
});

gulp.task("watch", function() {
    gulp.watch(["./*.js", "./*.json"], [
        "build"
    ]);
});
