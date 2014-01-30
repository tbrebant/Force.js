#import "EJBindingForceDataStorage.h"
#import "EJJavaScriptView.h"
#import "EJDrawable.h"
#import "EJTexture.h"
#import "EJBindingImage.h"

@implementation EJBindingForceDataStorage

- (id)initWithContext:(JSContextRef) ctx argc:(size_t)argc argv:(const JSValueRef [])argv {
    if (self = [super initWithContext:ctx argc:argc argv:argv] ) {}
    return self;
}

EJ_BIND_FUNCTION(saveImage, ctx, argc, argv) {
	// retrieve the data key
	NSString *key = JSValueToNSString(ctx, argv[0]);
	
	// retrieve the image
	NSObject<EJDrawable> *drawable = (NSObject<EJDrawable> *)JSObjectGetPrivate((JSObjectRef)argv[1]);
	EJTexture *image = drawable.texture;
	if( !image ) { return NULL; }
	UIImage *uiimg = image.image;
	
	// save it
	[self saveImage:uiimg imageName:key];
	
    return NULL;
}

EJ_BIND_FUNCTION(getImagePath, ctx, argc, argv) {
	// retrieve the data key
	NSString *key = JSValueToNSString(ctx, argv[0]);
	
	// retrieve and return the path
	NSString *fullPath = [self getImagePath:key];
	const char *cString = [fullPath cStringUsingEncoding:NSASCIIStringEncoding];
	return JSValueMakeString(ctx, JSStringCreateWithUTF8CString(cString));
}

EJ_BIND_FUNCTION(removeImage, ctx, argc, argv) {
	// retrieve the data key
	NSString *key = JSValueToNSString(ctx, argv[0]);
	
	[self removeImage:key];
	
	return NULL;
}

// save an image
- (void)saveImage:(UIImage*)image imageName:(NSString*)imageName {
	NSData *imageData = UIImagePNGRepresentation(image);
	NSFileManager *fileManager = [NSFileManager defaultManager];
	NSString *fullPath = [self getImagePath:imageName];
	[fileManager createFileAtPath:fullPath contents:imageData attributes:nil];
	NSLog(@"image saved");
}

// load an image
- (UIImage*)loadImage:(NSString*)imageName {
	NSString *fullPath = [self getImagePath:imageName];
	return [UIImage imageWithContentsOfFile:fullPath];
}

// remove an image
- (void)removeImage:(NSString*)imageName {
	NSFileManager *fileManager = [NSFileManager defaultManager];
	NSString *fullPath = [self getImagePath:imageName];
	[fileManager removeItemAtPath: fullPath error:NULL];
	NSLog(@"image removed");
}

// get image path
- (NSString*)getImagePath:(NSString*)imageName {
	NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
	NSString *documentsDirectory = [paths objectAtIndex:0];
	NSString *fullPath = [documentsDirectory stringByAppendingPathComponent:[NSString stringWithFormat:@"%@.png", imageName]];
	return fullPath;
}

@end
