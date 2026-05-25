export interface AppUser {
  id: number;
  username: string;
  email?: string;
  roles: string[];   // le backend retourne List<String> (noms bruts, ex. "USER", "ADMIN")
}

export interface CreateUserDto {
  username: string;
  password: string;
  email?: string;
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}
