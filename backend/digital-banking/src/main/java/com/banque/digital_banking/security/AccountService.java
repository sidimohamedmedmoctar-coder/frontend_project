package com.banque.digital_banking.security;

public interface AccountService {

    AppUser addNewUser(AppUser appUser);

    AppRole addNewRole(AppRole appRole);

    void addRoleToUser(String username, String roleName);

    AppUser loadUserByUsername(String username);
}
