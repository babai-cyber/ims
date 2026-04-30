variable "aws_region"       { default = "ap-south-1" }
variable "environment"      { default = "prod" }
variable "ec2_ami"          { default = "ami-0c55b159cbfafe1f0" }  # Amazon Linux 2023
variable "key_pair_name"    { description = "EC2 Key Pair name" }
variable "db_password"      { description = "RDS master password"; sensitive = true }
variable "allowed_ssh_cidr" { description = "Your IP for SSH access"; default = "0.0.0.0/0" }
variable "ecr_registry"     { description = "ECR registry URL" }
