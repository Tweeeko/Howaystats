-- Lead photo from the publisher's feed, shown with a link back to the original.
alter table news_articles add column if not exists image_url text;
