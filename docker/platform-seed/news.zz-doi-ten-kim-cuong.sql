-- Doi thuat ngu "Nguyen bao" -> "Kim cuong" cho TIN DA CO trong DB (2026-09-07).
-- news.haitac.sql chi chen khi bang trong, nen tin dang co phai sua bang UPDATE. Chay sau cung
-- (ten file bat dau bang "news.zz-"), lap lai vo hai.
UPDATE news
   SET title   = REPLACE(REPLACE(REPLACE(title,   'Nguyên Bảo', 'Kim Cương'), 'Nguyên bảo', 'Kim cương'), 'nguyên bảo', 'kim cương'),
       summary = REPLACE(REPLACE(REPLACE(summary, 'Nguyên Bảo', 'Kim Cương'), 'Nguyên bảo', 'Kim cương'), 'nguyên bảo', 'kim cương'),
       body    = REPLACE(REPLACE(REPLACE(body,    'Nguyên Bảo', 'Kim Cương'), 'Nguyên bảo', 'Kim cương'), 'nguyên bảo', 'kim cương')
 WHERE title LIKE '%guyên %ảo%' OR summary LIKE '%guyên %ảo%' OR body LIKE '%guyên %ảo%';
