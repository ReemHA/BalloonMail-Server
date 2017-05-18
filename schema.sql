-- INIT DB

IF NOT EXISTS(select * from sys.databases where name='$db_name$')
BEGIN
    Create database $db_name$
END

--- __END__INIT ---

Use $db_name$
-- -----------------------------------------------------
-- Table `user`
-- -----------------------------------------------------
if not exists (select * from sysobjects where name='user' and xtype='U')
BEGIN

CREATE TABLE [user] (
  [user_id] INT CHECK ([user_id] >= 0) NOT NULL IDENTITY,
  [name] NVARCHAR(100) NOT NULL,
  [email] VARCHAR(100) NULL DEFAULT NULL,
  [password] VARCHAR(100) NULL DEFAULT NULL,
  [google_id] VARCHAR(255) NULL DEFAULT NULL,
  [facebook_id] VARCHAR(30) NULL DEFAULT NULL,
  [twitter_id] VARCHAR(45) NULL DEFAULT NULL,
  [created_at] DATETIME2(0) NOT NULL,
  [lng] DECIMAL(9,6) NULL DEFAULT NULL,
  [lat] DECIMAL(8,6) NULL DEFAULT NULL,
  [gcm_id] VARCHAR(255) NOT NULL,
  PRIMARY KEY ([user_id]))
;

CREATE UNIQUE INDEX [email_UNIQUE] ON [user]([email] ASC)
WHERE [email] IS NOT NULL

CREATE UNIQUE INDEX [google_id_UNIQUE] ON [user]([google_id] ASC)
WHERE [google_id] IS NOT NULL

CREATE UNIQUE INDEX [facebook_id_UNIQUE] ON [user]([facebook_id] ASC)
WHERE [facebook_id] IS NOT NULL

CREATE UNIQUE INDEX [twitter_id_UNIQUE] ON [user]([twitter_id] ASC)
WHERE [twitter_id] IS NOT NULL

-- -----------------------------------------------------
-- Table `balloons`
-- -----------------------------------------------------
CREATE TABLE balloons (
  [balloon_id] INT CHECK ([balloon_id] > 0) NOT NULL IDENTITY,
  [user_id] INT CHECK ([user_id] >= 0) NOT NULL,
  [text] NVARCHAR(3000) NOT NULL,
  [refills] INT CHECK ([refills] >= 0) NOT NULL DEFAULT 0,
  [creeps] INT CHECK ([creeps] >= 0) NOT NULL DEFAULT 0,
  [reach] FLOAT CHECK ([reach] >= 0) NOT NULL DEFAULT 0,
  [sent_at] DATETIME2(0) NOT NULL,
  [rank] INT CHECK ([rank] >= 0) NOT NULL DEFAULT 0,
  [sentiment] FLOAT NOT NULL DEFAULT 0,
  [lng] DECIMAL(9,6) NULL DEFAULT NULL,
  [lat] DECIMAL(8,6) NULL DEFAULT NULL
 ,
  PRIMARY KEY ([balloon_id])
 ,
  CONSTRAINT [balloon_user]
    FOREIGN KEY ([user_id])
    REFERENCES [user] ([user_id])
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
;

CREATE INDEX [sent_date] ON balloons ([user_id] ASC, [sent_at] ASC);
CREATE INDEX [balloon_user_idx] ON balloons ([user_id] ASC);


-- -----------------------------------------------------
-- Table `balloon`.`paths`
-- -----------------------------------------------------
CREATE TABLE paths (
  [path_id] BIGINT CHECK ([path_id] >= 0) NOT NULL IDENTITY,
  [balloon_id] INT CHECK ([balloon_id] >= 0) NOT NULL,
  [from_user] INT CHECK ([from_user] >= 0) NOT NULL,
  [from_lat] DECIMAL(8,6) NULL,
  [from_lng] DECIMAL(9,6) NULL,
  [to_user] INT CHECK ([to_user] >= 0) NOT NULL,
  [to_lat] DECIMAL(8,6) NULL,
  [to_lng] DECIMAL(9,6) NULL,
  [sent_at] DATETIME2(0) NOT NULL,
  [to_refilled] BIT NOT NULL DEFAULT 0,
  [to_liked] BIT NOT NULL DEFAULT 0,
  [to_creeped] BIT NOT NULL DEFAULT 0,
  PRIMARY KEY ([path_id])
 ,
  CONSTRAINT [receive_once] UNIQUE  ([balloon_id] ASC, [to_user] ASC),
  CONSTRAINT [liked_balloons]
    FOREIGN KEY ([balloon_id])
    REFERENCES balloons ([balloon_id])
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT [sending_user]
    FOREIGN KEY ([from_user])
    REFERENCES [user] ([user_id])
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT [receiving_user]
    FOREIGN KEY ([to_user])
    REFERENCES [user] ([user_id])
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
;

CREATE INDEX [path_balloons_idx] ON paths ([balloon_id] ASC);
CREATE INDEX [sending_user_idx] ON paths ([from_user] ASC);
CREATE INDEX [receiving_user_idx] ON paths ([to_user] ASC);
CREATE INDEX [receive_date] ON paths ([to_user] ASC, [sent_at] ASC);


-- -----------------------------------------------------
-- Table `balloon`.`likes`
-- -----------------------------------------------------
CREATE TABLE likes (
  [balloon_id] INT CHECK ([balloon_id] >= 0) NOT NULL,
  [user_id] INT CHECK ([user_id] >= 0) NOT NULL,
  [liked_at] DATETIME2(0) NOT NULL,
  PRIMARY KEY ([balloon_id], [user_id])
 ,
  CONSTRAINT [liked_balloon]
    FOREIGN KEY ([balloon_id])
    REFERENCES balloons ([balloon_id])
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT [liking_users]
    FOREIGN KEY ([user_id])
    REFERENCES [user] ([user_id])
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
;

CREATE INDEX [likes_users_idx] ON likes ([user_id] ASC);

END
