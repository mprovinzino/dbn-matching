import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, UserCog, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface UserWithRoles {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
}

export function UserManagement() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_all_users_with_roles');
      
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load users',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentRoles: string[]) => {
    const hasAdmin = currentRoles.includes('admin');
    
    try {
      setActionLoading(userId);
      
      if (hasAdmin) {
        // Remove admin role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Admin role removed',
        });
      } else {
        // Get current user ID for created_by
        const { data: { user } } = await supabase.auth.getUser();
        
        // Add admin role
        const { error } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'admin',
            created_by: user?.id,
          });
        
        if (error) throw error;
        
        toast({
          title: 'Success',
          description: 'Admin role granted',
        });
      }
      
      await fetchUsers();
    } catch (error: any) {
      console.error('Error toggling admin role:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update role',
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          User Management
        </CardTitle>
        <CardDescription>
          Manage user roles and permissions. Total users: {users.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={role === 'admin' ? 'default' : 'secondary'}
                            className="flex items-center gap-1"
                          >
                            {role === 'admin' && <Shield className="h-3 w-3" />}
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">No roles</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {user.last_sign_in_at
                      ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={user.roles.includes('admin') ? 'destructive' : 'default'}
                      size="sm"
                      onClick={() => toggleAdminRole(user.user_id, user.roles)}
                      disabled={actionLoading === user.user_id}
                    >
                      {actionLoading === user.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user.roles.includes('admin') ? (
                        'Remove Admin'
                      ) : (
                        'Make Admin'
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
