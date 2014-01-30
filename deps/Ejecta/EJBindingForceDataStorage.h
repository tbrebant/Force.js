#import "EJBindingBase.h"

@interface EJBindingForceDataStorage : EJBindingBase {
	JSObjectRef saveCallback;
	JSObjectRef loadCallback;
}

- (void)saveImage:(UIImage*)image imageName:(NSString*)imageName;
- (UIImage*)loadImage:(NSString*)imageName;
- (void)removeImage:(NSString*)fileName;
- (NSString*)getImagePath:(NSString*)imageName;

@end
