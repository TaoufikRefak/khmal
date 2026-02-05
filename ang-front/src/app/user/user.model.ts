export interface User {
    id: number;
    name: string;
    email: string;
    role: 'student' | 'teacher' | 'admin' ;
    branch_id?: number;
    created_at: string;
    updated_at: string;
  }
  
  export interface UserUpdateDto extends Partial<Pick<User, 'name' | 'email' | 'role' | 'branch_id'>> {}
  
  export interface UserFilters extends Partial<Pick<User, 'role' | 'branch_id'>> {
    page?: number;
    limit?: number;
  }