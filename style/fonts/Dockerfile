FROM node:5
WORKDIR /font
RUN apt-get update && apt-get install -y unzip
RUN wget http://quoteunquoteapps.com/downloads/courier-sans.zip \
&& unzip courier-sans.zip
ADD index.js /font
RUN npm install fontmin
ENTRYPOINT ["node", "index"]
