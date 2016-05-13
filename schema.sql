
-- -----------------------------------------------------
-- Schema balloon
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `balloon` DEFAULT CHARACTER SET utf8 ;


-- -----------------------------------------------------
-- Table `balloon`.`user`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `balloon`.`user` (
  `user_id` INT(11) UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(100) NULL DEFAULT NULL,
  `password` VARCHAR(100) NULL DEFAULT NULL,
  `google_id` VARCHAR(30) NULL DEFAULT NULL,
  `facebook_id` VARCHAR(30) NULL DEFAULT NULL,
  `twitter_id` VARCHAR(45) NULL DEFAULT NULL,
  `created_at` DATETIME NOT NULL,
  `lng` DECIMAL(9,6) NULL DEFAULT NULL,
  `lat` DECIMAL(8,8) NULL DEFAULT NULL,
  `gcm_id` VARCHAR(35) NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE INDEX `google_id_UNIQUE` (`google_id` ASC),
  UNIQUE INDEX `facebook_id_UNIQUE` (`facebook_id` ASC),
  UNIQUE INDEX `twitter_id_UNIQUE` (`twitter_id` ASC),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC))
ENGINE = InnoDB
DEFAULT CHARACTER SET = utf8;


-- -----------------------------------------------------
-- Table `balloon`.`balloons`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `balloon`.`balloons` (
  `balloon_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `text` VARCHAR(3000) NOT NULL,
  `refills` INT UNSIGNED NOT NULL DEFAULT 0,
  `creeps` INT UNSIGNED NOT NULL DEFAULT 0,
  `reach` FLOAT UNSIGNED NOT NULL DEFAULT 0,
  `sent_at` DATETIME(0) NOT NULL,
  `rank` INT UNSIGNED NOT NULL DEFAULT 0,
  `sentiment` FLOAT NOT NULL DEFAULT 0,
  `lng` DECIMAL(9,6) NULL DEFAULT NULL,
  `lat` DECIMAL(8,8) NULL DEFAULT NULL,
  `in_flight` INT UNSIGNED NOT NULL,
  INDEX `sent_date` (`user_id` ASC, `sent_at` ASC),
  PRIMARY KEY (`balloon_id`),
  INDEX `balloon_user_idx` (`user_id` ASC),
  CONSTRAINT `balloon_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `balloon`.`user` (`user_id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `balloon`.`paths`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `balloon`.`paths` (
  `path_id` BIGINT(0) UNSIGNED NOT NULL AUTO_INCREMENT,
  `balloon_id` INT UNSIGNED NOT NULL,
  `from_user` INT UNSIGNED NOT NULL,
  `from_lat` DECIMAL(8,6) NULL,
  `from_lng` DECIMAL(9,6) NULL,
  `to_user` INT UNSIGNED NOT NULL,
  `to_lat` DECIMAL(8,6) NULL,
  `to_lng` DECIMAL(9,6) NULL,
  `sent_at` DATETIME(0) NOT NULL,
  `to_refilled` BOOL NOT NULL DEFAULT false,
  `to_liked` BOOL NOT NULL DEFAULT false,
  `to_creeped` BOOL NOT NULL DEFAULT false,
  PRIMARY KEY (`path_id`),
  INDEX `path_balloons_idx` (`balloon_id` ASC),
  INDEX `sending_user_idx` (`from_user` ASC),
  INDEX `receiving_user_idx` (`to_user` ASC),
  INDEX `receive_date` (`to_user` ASC, `sent_at` ASC),
  UNIQUE INDEX `receive_once` (`balloon_id` ASC, `to_user` ASC),
  CONSTRAINT `liked_balloons`
    FOREIGN KEY (`balloon_id`)
    REFERENCES `balloon`.`balloons` (`balloon_id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `sending_user`
    FOREIGN KEY (`from_user`)
    REFERENCES `balloon`.`user` (`user_id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `receiving_user`
    FOREIGN KEY (`to_user`)
    REFERENCES `balloon`.`user` (`user_id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `balloon`.`likes`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `balloon`.`likes` (
  `balloon_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `liked_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`balloon_id`, `user_id`),
  INDEX `likes_users_idx` (`user_id` ASC),
  CONSTRAINT `liked_balloon`
    FOREIGN KEY (`balloon_id`)
    REFERENCES `balloon`.`balloons` (`balloon_id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `liking_users`
    FOREIGN KEY (`user_id`)
    REFERENCES `balloon`.`user` (`user_id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `balloon`.`creeps`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `balloon`.`creeps` (
  `balloon_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `creeped_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`balloon_id`, `user_id`),
  INDEX `creep_users_idx` (`user_id` ASC),
  CONSTRAINT `creeped_balloons`
    FOREIGN KEY (`balloon_id`)
    REFERENCES `balloon`.`balloons` (`balloon_id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT,
  CONSTRAINT `creeping_users`
    FOREIGN KEY (`user_id`)
    REFERENCES `balloon`.`user` (`user_id`)
    ON DELETE RESTRICT
    ON UPDATE RESTRICT)
ENGINE = InnoDB;
