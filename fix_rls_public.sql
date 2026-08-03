-- Create public read policies for tables needed on the public dashboard
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Public students are viewable by everyone." ON students FOR SELECT USING (true);
CREATE POLICY "Public attendance are viewable by everyone." ON attendance_logs FOR SELECT USING (true);
CREATE POLICY "Public homeroom are viewable by everyone." ON homeroom_attendance FOR SELECT USING (true);
CREATE POLICY "Public journals are viewable by everyone." ON journals FOR SELECT USING (true);
CREATE POLICY "Public classes are viewable by everyone." ON classes FOR SELECT USING (true);
