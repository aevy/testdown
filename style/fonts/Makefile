all: build run
build:; docker build -t mbrock/courier-prime-sans .
run:; docker run --rm -v `pwd`:/result mbrock/courier-prime-sans
