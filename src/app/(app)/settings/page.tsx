import { PageHeader } from '@/components/PageHeader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { FolderSync } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="container mx-auto max-w-3xl">
      <PageHeader title="Settings" />
      <div className="space-y-8 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the app.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Storage</CardTitle>
            <CardDescription>
              Manage the folder where your music is stored.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              <FolderSync className="mr-2 h-4 w-4" />
              Change Music Folder
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
