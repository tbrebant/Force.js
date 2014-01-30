#import "EJBindingForceHelpers.h"

@implementation EJBindingForceHelpers

EJ_BIND_FUNCTION(getIdentifierForVendor, ctx, argc, argv) {
	NSString* uniqueIdentifier = nil;
	if( [UIDevice instancesRespondToSelector:@selector(identifierForVendor)] ) {
		// iOS 6+
		uniqueIdentifier = [[[UIDevice currentDevice] identifierForVendor] UUIDString];
	} else {
		// before iOS 6, so just generate an identifier and store it
		uniqueIdentifier = [[NSUserDefaults standardUserDefaults] objectForKey:@"identiferForVendor"];
		if( !uniqueIdentifier ) {
			CFUUIDRef uuid = CFUUIDCreate(NULL);
			uniqueIdentifier = (NSString*) CFUUIDCreateString(NULL, uuid);
			CFRelease(uuid);
			[[NSUserDefaults standardUserDefaults] setObject:uniqueIdentifier forKey:@"identifierForVendor"];
		}
	}
	
	const char *cString = [uniqueIdentifier cStringUsingEncoding:NSASCIIStringEncoding];
	return JSValueMakeString(ctx, JSStringCreateWithUTF8CString(cString));
}

@end
