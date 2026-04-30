terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "ims-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "ap-south-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# ─── VPC ─────────────────────────────────────────────────
resource "aws_vpc" "ims" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = { Name = "ims-vpc", Project = "IMS", Environment = var.environment }
}

resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.ims.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "ims-public-${count.index + 1}" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.ims.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = { Name = "ims-private-${count.index + 1}" }
}

resource "aws_internet_gateway" "ims" {
  vpc_id = aws_vpc.ims.id
  tags = { Name = "ims-igw" }
}

data "aws_availability_zones" "available" { state = "available" }

# ─── EC2 (Simple deployment - no K8s) ───────────────────
resource "aws_security_group" "app" {
  name   = "ims-app-sg"
  vpc_id = aws_vpc.ims.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]  # Restrict SSH (OWASP A05)
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "ims-app-sg" }
}

resource "aws_instance" "ims" {
  ami                    = var.ec2_ami
  instance_type          = "t3.medium"
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.app.id]
  key_name               = var.key_pair_name

  root_block_device {
    volume_size = 30
    encrypted   = true  # Security: encrypt at rest
  }

  user_data = templatefile("${path.module}/userdata.sh", {
    ecr_registry = var.ecr_registry
    aws_region   = var.aws_region
  })

  tags = { Name = "ims-app-server", Project = "IMS" }
}

# ─── RDS PostgreSQL ──────────────────────────────────────
resource "aws_db_subnet_group" "ims" {
  name       = "ims-db-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_security_group" "rds" {
  name   = "ims-rds-sg"
  vpc_id = aws_vpc.ims.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]  # Only from app servers
  }
}

resource "aws_db_instance" "postgres" {
  identifier           = "ims-postgres"
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  db_name              = "ims"
  username             = "ims_user"
  password             = var.db_password
  db_subnet_group_name = aws_db_subnet_group.ims.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  skip_final_snapshot  = false
  storage_encrypted    = true  # Security: encrypt at rest
  deletion_protection  = true
  backup_retention_period = 7
  tags = { Name = "ims-postgres" }
}

# ─── ElastiCache Redis ───────────────────────────────────
resource "aws_elasticache_subnet_group" "ims" {
  name       = "ims-redis-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "ims-redis"
  description          = "IMS Redis cache"
  node_type            = "cache.t3.micro"
  num_cache_clusters   = 1
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.ims.name
  at_rest_encryption_enabled = true  # Security
  transit_encryption_enabled = true
  tags = { Name = "ims-redis" }
}

# ─── Outputs ─────────────────────────────────────────────
output "app_server_ip" { value = aws_instance.ims.public_ip }
output "rds_endpoint"  { value = aws_db_instance.postgres.endpoint }
output "redis_endpoint" { value = aws_elasticache_replication_group.redis.primary_endpoint_address }
