import { ConfigService } from '@nestjs/config';

/**
 * Utility to trigger frontend revalidation after content updates
 */
export class RevalidateUtil {
  private static configService: ConfigService;

  static initialize(configService: ConfigService) {
    RevalidateUtil.configService = configService;
  }

  /**
   * Trigger revalidation for a specific path
   */
  static async revalidatePath(path: string): Promise<void> {
    if (!RevalidateUtil.configService) {
      console.warn('RevalidateUtil not initialized');
      return;
    }

    const frontendUrl =
      RevalidateUtil.configService.get<string>('FRONTEND_BASE_URL') ||
      RevalidateUtil.configService.get<string>('FRONTEND_URL') ||
      'http://localhost:3000';

    const token = RevalidateUtil.configService.get<string>('REVALIDATE_TOKEN');

    if (!token) {
      console.warn('REVALIDATE_TOKEN not configured, skipping revalidation');
      return;
    }

    try {
      const response = await fetch(
        `${frontendUrl}/api/revalidate?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        console.error(`Revalidation failed for ${path}: ${response.statusText}`);
      } else {
        console.log(`Successfully revalidated: ${path}`);
      }
    } catch (error) {
      console.error(`Error revalidating ${path}:`, error);
      // Don't throw - revalidation failure shouldn't break the main operation
    }
  }

  /**
   * Trigger revalidation for multiple paths
   */
  static async revalidatePaths(paths: string[]): Promise<void> {
    await Promise.all(paths.map((path) => RevalidateUtil.revalidatePath(path)));
  }

  /**
   * Trigger revalidation for blog-related paths
   */
  static async revalidateBlog(slug?: string): Promise<void> {
    const paths = ['/blog'];
    if (slug) {
      paths.push(`/blog/${slug}`);
    }
    await RevalidateUtil.revalidatePaths(paths);
  }

  /**
   * Trigger revalidation for gallery
   */
  static async revalidateGallery(): Promise<void> {
    await RevalidateUtil.revalidatePath('/');
  }

  /**
   * Trigger revalidation for services
   */
  static async revalidateServices(): Promise<void> {
    await RevalidateUtil.revalidatePath('/');
  }

  /**
   * Trigger revalidation for team
   */
  static async revalidateTeam(): Promise<void> {
    await RevalidateUtil.revalidatePath('/');
  }

  /**
   * Trigger revalidation for hero images (homepage)
   */
  static async revalidateHero(): Promise<void> {
    await RevalidateUtil.revalidatePath('/');
  }

  /**
   * Trigger revalidation for homepage (when any content changes)
   */
  static async revalidateHomepage(): Promise<void> {
    await RevalidateUtil.revalidatePath('/');
  }
}

